// Supabase Edge Function - admin sets a login password directly for a
// partner or a new staff account, no email-invite-link flow (replaces the
// old invite-partner function, which used Supabase Auth's inviteUserByEmail/
// resetPasswordForEmail - the client's brief now wants admin to set
// username(=email)/password directly, not a "click here to set your own
// password" link).
//
// Four modes:
//   mode: 'partner' - links/creates the auth user, sets partners.user_id.
//   mode: 'staff' - creates the auth user, inserts an admin_users row with
//     role 'staff_admin'. Only a FULL admin (role='admin') may create staff
//     accounts - checked here server-side via admin_users.role, not just
//     "is this caller an admin at all."
//   mode: 'update_staff' - edits an existing admin_users account (name/
//     email/role/permissions, optional password reset). Same full-admin-
//     only gate; refuses to demote the last remaining role='admin' account
//     so the portal can never end up with nobody able to manage staff.
//   mode: 'revoke_staff' - removes an admin_users row (the auth user
//     itself is left alone - RequireAuth already treats "signed in but no
//     admin_users row" as "not an admin," so this is enough to cut off
//     portal access without a destructive auth.users delete). Same
//     last-admin guard as update_staff.
//
// Emailing the credentials is opt-in (`sendEmail: true` in the request
// body), never automatic - staff and partners are both told their login in
// person as often as not, so the account is always created/password set
// regardless, and the email is a separate, optional courtesy on top.
//
// Secrets required (set with `supabase secrets set KEY=value`):
//   RESEND_API_KEY, EMAIL_FROM (already set - reused from send-order-email/
//   send-partner-email, nothing new to configure)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// SITE_URL is no longer needed by this function - no redirect link is
// generated anymore, the partner logs in directly with email + password.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'Lean & Fit <orders@leanandfit.ph>';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// createUser() failures were previously always reported as a bare 500
// ("Internal Server Error" in the browser network tab, no way to tell a
// real server fault from an ordinary "that email is already registered"
// without opening the Function logs). Map the common, expected failure
// to a real 4xx with an actionable message; only truly unexpected
// createUser failures fall through to 500.
function createUserErrorResponse(message: string) {
  const status = /already.*registered|already exists/i.test(message) ? 409 : 400;
  return jsonResponse({ error: message }, status);
}

/** True if demoting/removing `targetUserId` (currently role='admin') would leave zero full admins. */
async function wouldRemoveLastAdmin(targetUserId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from('admin_users')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .neq('user_id', targetUserId);
  return (count ?? 0) === 0;
}

async function sendCredentialsEmail(to: string, name: string, email: string, password: string, portalLabel: string) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - skipping credentials email.', { to });
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: `Your Lean & Fit ${portalLabel} Access`,
      html: `<p>Hi ${name},</p><p>Your Lean & Fit ${portalLabel} login is ready.</p>
        <p><strong>Email:</strong> ${email}<br/><strong>Password:</strong> ${password}</p>
        <p>Please sign in and change your password once you're in.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend error (${res.status}): ${await res.text()}`);
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { data: callerRow } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle();
    if (!callerRow) {
      return jsonResponse({ error: 'Only admins can grant portal access' }, 403);
    }

    const { mode, password, partnerId, fullName, email, sendEmail, staffUserId, role, permissions } =
      await req.json();

    if (mode === 'update_staff' || mode === 'revoke_staff') {
      if (callerRow.role !== 'admin') {
        return jsonResponse({ error: 'Only a full admin can manage staff accounts' }, 403);
      }
      if (!staffUserId) {
        return jsonResponse({ error: 'staffUserId is required' }, 400);
      }

      const { data: target, error: targetError } = await supabaseAdmin
        .from('admin_users')
        .select('user_id, role')
        .eq('user_id', staffUserId)
        .maybeSingle();
      if (targetError || !target) {
        return jsonResponse({ error: 'Staff account not found' }, 404);
      }

      const demoting = target.role === 'admin' && (mode === 'revoke_staff' || role === 'staff_admin');
      if (demoting && (await wouldRemoveLastAdmin(target.user_id))) {
        return jsonResponse(
          { error: 'This is the last remaining Admin account - promote someone else first.' },
          400,
        );
      }

      if (mode === 'revoke_staff') {
        const { error: deleteError } = await supabaseAdmin.from('admin_users').delete().eq('user_id', staffUserId);
        if (deleteError) return jsonResponse({ error: deleteError.message }, 500);
        return jsonResponse({ ok: true });
      }

      // mode === 'update_staff'
      if (password && password.length > 0 && password.length < 8) {
        return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
      }
      if (role && role !== 'admin' && role !== 'staff_admin') {
        return jsonResponse({ error: 'Invalid role' }, 400);
      }
      if (email || password) {
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(staffUserId, {
          ...(email ? { email, email_confirm: true } : {}),
          ...(password ? { password } : {}),
          ...(fullName ? { user_metadata: { full_name: fullName } } : {}),
        });
        if (authUpdateError) return createUserErrorResponse(authUpdateError.message);
      }

      const rowUpdate: Record<string, unknown> = {};
      if (fullName) rowUpdate.full_name = fullName;
      if (email) rowUpdate.email = email;
      if (role) rowUpdate.role = role;
      if (permissions) rowUpdate.permissions = permissions;

      if (Object.keys(rowUpdate).length > 0) {
        const { error: rowError } = await supabaseAdmin.from('admin_users').update(rowUpdate).eq('user_id', staffUserId);
        if (rowError) return jsonResponse({ error: rowError.message }, 500);
      }

      let emailError: string | null = null;
      if (sendEmail && password && email) {
        try {
          await sendCredentialsEmail(email, fullName ?? 'there', email, password, 'Staff Admin');
        } catch (err) {
          emailError = String(err);
        }
      }
      return jsonResponse({ ok: true, emailSent: Boolean(sendEmail && password && email) && !emailError, emailError });
    }

    if (!password || password.length < 8) {
      return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
    }

    if (mode === 'staff') {
      if (callerRow.role !== 'admin') {
        return jsonResponse({ error: 'Only a full admin can create staff accounts' }, 403);
      }
      if (!email || !fullName) {
        return jsonResponse({ error: 'email and fullName are required' }, 400);
      }

      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError || !created.user) {
        return createUserErrorResponse(createError?.message ?? 'Failed to create staff user');
      }

      const { error: insertError } = await supabaseAdmin
        .from('admin_users')
        .insert({ user_id: created.user.id, role: 'staff_admin', email, full_name: fullName, permissions: permissions ?? {} });
      if (insertError) {
        // Roll back the auth user rather than leaving an orphan with no
        // admin_users row - otherwise every retry with the same email
        // permanently fails createUser with "already registered" and the
        // account can never actually be created.
        await supabaseAdmin.auth.admin.deleteUser(created.user.id);
        return jsonResponse({ error: insertError.message }, 500);
      }

      let emailError: string | null = null;
      if (sendEmail) {
        try {
          await sendCredentialsEmail(email, fullName, email, password, 'Staff Admin');
        } catch (err) {
          emailError = String(err);
        }
      }
      return jsonResponse({ ok: true, emailSent: Boolean(sendEmail) && !emailError, emailError });
    }

    // mode === 'partner' (default)
    if (callerRow.role !== 'admin') {
      return jsonResponse({ error: 'Only a full admin can grant partner portal access' }, 403);
    }
    if (!partnerId) {
      return jsonResponse({ error: 'partnerId is required' }, 400);
    }

    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('partners')
      .select('id, email, full_name, status, user_id')
      .eq('id', partnerId)
      .single();
    if (partnerError || !partner) {
      return jsonResponse({ error: 'Partner not found' }, 404);
    }
    if (partner.status !== 'active') {
      return jsonResponse({ error: 'Only an active (approved) partner can be granted access' }, 400);
    }

    if (partner.user_id) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(partner.user_id, { password });
      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500);
      }
    } else {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: partner.email,
        password,
        email_confirm: true,
        user_metadata: { partner_id: partner.id, full_name: partner.full_name },
      });
      if (createError || !created.user) {
        return createUserErrorResponse(createError?.message ?? 'Failed to create partner user');
      }
      const { error: linkError } = await supabaseAdmin
        .from('partners')
        .update({ user_id: created.user.id })
        .eq('id', partner.id);
      if (linkError) {
        // Same rollback reasoning as the staff branch above - an orphaned
        // auth user with no linked partner row would permanently block
        // retrying with this partner's email.
        await supabaseAdmin.auth.admin.deleteUser(created.user.id);
        return jsonResponse({ error: linkError.message }, 500);
      }
    }

    let emailError: string | null = null;
    if (sendEmail) {
      try {
        await sendCredentialsEmail(partner.email, partner.full_name, partner.email, password, 'Partner Portal');
      } catch (err) {
        emailError = String(err);
      }
    }
    return jsonResponse({ ok: true, emailSent: Boolean(sendEmail) && !emailError, emailError });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

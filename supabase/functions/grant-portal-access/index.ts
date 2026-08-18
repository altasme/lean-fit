// Supabase Edge Function - admin sets a login password directly for a
// partner or a new staff account, no email-invite-link flow (replaces the
// old invite-partner function, which used Supabase Auth's inviteUserByEmail/
// resetPasswordForEmail - the client's brief now wants admin to set
// username(=email)/password directly and have those credentials emailed to
// the account holder, not a "click here to set your own password" link).
//
// Two modes:
//   mode: 'partner' - links/creates the auth user, sets partners.user_id,
//     sends the partner their credentials via send-partner-email.
//   mode: 'staff' - creates the auth user, inserts an admin_users row with
//     role 'staff_admin'. Only a FULL admin (role='admin') may create staff
//     accounts - checked here server-side via admin_users.role, not just
//     "is this caller an admin at all."
//
// Secrets required (set with `supabase secrets set KEY=value`):
//   RESEND_API_KEY, EMAIL_FROM (already set - reused from send-order-email/
//   send-partner-email, nothing new to configure)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// SITE_URL is no longer needed by this function - no redirect link is
// generated anymore, the partner logs in directly with email + password.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'Lean & Fit <orders@leanfitcoffee.com>';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

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
  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data: callerRow } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle();
    if (!callerRow) {
      return new Response(JSON.stringify({ error: 'Only admins can grant portal access' }), { status: 403 });
    }

    const { mode, password, partnerId, fullName, email } = await req.json();
    if (!password || password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), { status: 400 });
    }

    if (mode === 'staff') {
      if (callerRow.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Only a full admin can create staff accounts' }), { status: 403 });
      }
      if (!email || !fullName) {
        return new Response(JSON.stringify({ error: 'email and fullName are required' }), { status: 400 });
      }

      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError || !created.user) {
        return new Response(JSON.stringify({ error: createError?.message ?? 'Failed to create staff user' }), { status: 500 });
      }

      const { error: insertError } = await supabaseAdmin
        .from('admin_users')
        .insert({ user_id: created.user.id, role: 'staff_admin' });
      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
      }

      await sendCredentialsEmail(email, fullName, email, password, 'Staff Admin');
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    // mode === 'partner' (default)
    if (callerRow.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only a full admin can grant partner portal access' }), { status: 403 });
    }
    if (!partnerId) {
      return new Response(JSON.stringify({ error: 'partnerId is required' }), { status: 400 });
    }

    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('partners')
      .select('id, email, full_name, status, user_id')
      .eq('id', partnerId)
      .single();
    if (partnerError || !partner) {
      return new Response(JSON.stringify({ error: 'Partner not found' }), { status: 404 });
    }
    if (partner.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Only an active (approved) partner can be granted access' }), { status: 400 });
    }

    if (partner.user_id) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(partner.user_id, { password });
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
      }
    } else {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: partner.email,
        password,
        email_confirm: true,
        user_metadata: { partner_id: partner.id, full_name: partner.full_name },
      });
      if (createError || !created.user) {
        return new Response(JSON.stringify({ error: createError?.message ?? 'Failed to create partner user' }), { status: 500 });
      }
      const { error: linkError } = await supabaseAdmin
        .from('partners')
        .update({ user_id: created.user.id })
        .eq('id', partner.id);
      if (linkError) {
        return new Response(JSON.stringify({ error: linkError.message }), { status: 500 });
      }
    }

    await sendCredentialsEmail(partner.email, partner.full_name, partner.email, password, 'Partner Portal');
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

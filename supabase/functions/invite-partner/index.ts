// Supabase Edge Function - creates the partner's portal login account and
// emails them an invite link (Supabase's own invite email + magic link).
//
// Invoked by the admin app right after `approve_partner()` succeeds, and
// again from a "Resend Portal Invite" action if the partner never
// completed setup. Admin-only - verifies the caller is a signed-in admin
// (admin_users membership) before touching auth.admin, since this can
// create arbitrary Supabase Auth users.
//
// Secrets required (set with `supabase secrets set KEY=value`):
//   SITE_URL (e.g. https://leanfitcoffee.com - the public site origin the
//   invite link redirects back to, NOT the admin subdomain)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE_URL = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '');

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

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

    const { data: adminRow } = await supabaseAdmin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', caller.id)
      .maybeSingle();

    if (!adminRow) {
      return new Response(JSON.stringify({ error: 'Only admins can send portal invites' }), {
        status: 403,
      });
    }

    if (!SITE_URL) {
      return new Response(JSON.stringify({ error: 'SITE_URL is not configured' }), { status: 500 });
    }

    const { partnerId } = await req.json();
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
      return new Response(
        JSON.stringify({ error: 'Only an active (approved) partner can be invited' }),
        { status: 400 },
      );
    }

    const redirectTo = `${SITE_URL}/reseller/set-password`;

    if (partner.user_id) {
      // Already has a login - a fresh invite would fail ("already
      // registered"). Resending access goes through the ordinary password
      // recovery flow instead, which lands on the same set-password page.
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(partner.email, {
        redirectTo,
      });
      if (resetError) {
        return new Response(JSON.stringify({ error: resetError.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ ok: true, mode: 'reset' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      partner.email,
      { redirectTo, data: { partner_id: partner.id, full_name: partner.full_name } },
    );

    if (inviteError || !invited.user) {
      return new Response(JSON.stringify({ error: inviteError?.message ?? 'Invite failed' }), {
        status: 500,
      });
    }

    const { error: linkError } = await supabaseAdmin
      .from('partners')
      .update({ user_id: invited.user.id })
      .eq('id', partner.id);

    if (linkError) {
      return new Response(JSON.stringify({ error: linkError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, mode: 'invite' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

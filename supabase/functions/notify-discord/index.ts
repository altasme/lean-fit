// Supabase Edge Function - posts Discord notifications for events that
// don't already have an email-sending function to piggyback on (client
// request: "connect this to Discord... new partner sign up
// notifications"). New order notifications instead piggyback directly on
// send-order-email's existing isNewOrder trigger - see that function.
//
// Invoked by the client right after a successful public partner lead
// submission (`event: "new_partner"`) - see src/pages/Reseller.tsx /
// src/lib/notify.ts's notifyDiscordNewPartner.
//
// Secrets required (set with `supabase secrets set KEY=value`):
//   DISCORD_PARTNERS_WEBHOOK_URL, SUPABASE_SERVICE_ROLE_KEY
// SUPABASE_URL is provided automatically in the Edge Function runtime.
// SITE_URL (optional, defaults to https://leanandfit.ph) - used to link
// the embed to the partner's admin detail page.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { postDiscordEmbed } from '../_shared/discord.ts';

const DISCORD_PARTNERS_WEBHOOK_URL = Deno.env.get('DISCORD_PARTNERS_WEBHOOK_URL');
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://leanandfit.ph').replace(/\/+$/, '');
const BARE_HOST = SITE_URL.replace(/^https?:\/\//, '');

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const PARTNER_TYPE_LABELS: Record<string, string> = {
  reseller: 'Reseller',
  distributor: 'Distributor',
  franchise: 'Franchise',
};

async function postNewPartnerNotification(partner: Record<string, unknown>): Promise<void> {
  const typeLabel = partner.partner_type
    ? (PARTNER_TYPE_LABELS[partner.partner_type as string] ?? String(partner.partner_type))
    : 'Not yet assigned';

  await postDiscordEmbed(
    DISCORD_PARTNERS_WEBHOOK_URL,
    `🤝 New Partner Application - ${partner.full_name}`,
    [
      { name: 'Email', value: String(partner.email), inline: true },
      { name: 'Mobile', value: String(partner.mobile), inline: true },
      { name: 'Type', value: typeLabel, inline: true },
      { name: 'Location', value: `${partner.city ?? 'n/a'}, ${partner.province ?? 'n/a'}` },
    ],
    { url: `https://admin.${BARE_HOST}/admin/partners/${partner.id}` },
  );
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const { event, partnerId } = await req.json();
    if (!event || !partnerId) {
      return jsonResponse({ error: 'event and partnerId are required' }, 400);
    }

    if (event === 'new_partner') {
      const { data: partner, error: partnerError } = await supabaseAdmin
        .from('partners')
        .select('*')
        .eq('id', partnerId)
        .single();
      if (partnerError || !partner) {
        return jsonResponse({ error: 'Partner not found' }, 404);
      }
      await postNewPartnerNotification(partner);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

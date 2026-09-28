// Supabase Edge Function - posts a weekly order management summary to
// Discord (client request: "Weekly order management reporting summary").
//
// NOT invoked by the client or by any other function - scheduled via
// Supabase's pg_cron (Database -> Cron Jobs, or the SQL in
// supabase/README.md's deployment step) to call this once a week. Reuses
// the exact same stat definitions/labels as the admin dashboard's
// OrderStats.tsx / lib/orderQuickFilter.ts, so the numbers in Discord
// always mean the same thing they do in Admin - just reimplemented here
// since a Deno Edge Function can't import from src/.
//
// Secrets required (set with `supabase secrets set KEY=value`):
//   DISCORD_REPORTS_WEBHOOK_URL, SUPABASE_SERVICE_ROLE_KEY
// SUPABASE_URL is provided automatically in the Edge Function runtime.
// SITE_URL (optional, defaults to https://leanandfit.ph) - links the
// embed to the admin order list.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/cors.ts';
import { postDiscordEmbed } from '../_shared/discord.ts';

const DISCORD_REPORTS_WEBHOOK_URL = Deno.env.get('DISCORD_REPORTS_WEBHOOK_URL');
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://leanandfit.ph').replace(/\/+$/, '');
const BARE_HOST = SITE_URL.replace(/^https?:\/\//, '');

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

type OrderRow = { id: string; order_no: string; status: string; total: number; created_at: string };
type PaymentRow = { order_id: string; status: string; method: string };

function formatPHP(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

Deno.serve(async () => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Two separate queries joined in JS, same as every other admin listing
    // in this project (see lib/adminOrders.ts's listOrders) - orders and
    // payments are never fetched via a PostgREST embedded-resource join
    // here, so this stays consistent with that established pattern.
    const [{ data: orders, error: ordersError }, { data: payments, error: paymentsError }] = await Promise.all([
      supabaseAdmin.from('orders').select('id, order_no, status, total, created_at').gte('created_at', since),
      supabaseAdmin.from('payments').select('order_id, status, method'),
    ]);
    if (ordersError) {
      console.error('weekly-order-report: failed to fetch orders', ordersError);
      return jsonResponse({ error: ordersError.message }, 500);
    }
    if (paymentsError) {
      console.error('weekly-order-report: failed to fetch payments', paymentsError);
      return jsonResponse({ error: paymentsError.message }, 500);
    }

    const rows = (orders ?? []) as OrderRow[];
    const paymentByOrderId = new Map(((payments ?? []) as PaymentRow[]).map((p) => [p.order_id, p]));
    const paymentOf = (o: OrderRow) => paymentByOrderId.get(o.id);

    const pendingVerification = rows.filter((o) => paymentOf(o)?.status === 'pending_verification').length;
    const codOutstanding = rows.filter((o) => paymentOf(o)?.method === 'cod' && paymentOf(o)?.status !== 'paid').length;
    const totalRevenue = rows
      .filter((o) => paymentOf(o)?.status === 'paid' && o.status !== 'returned')
      .reduce((sum, o) => sum + Number(o.total), 0);
    const toPack = rows.filter((o) => o.status === 'pending' || o.status === 'confirmed').length;
    const toShip = rows.filter((o) => o.status === 'packing').length;
    const shippedOut = rows.filter((o) => o.status === 'shipped').length;
    const delivered = rows.filter((o) => o.status === 'completed').length;
    const cancelled = rows.filter((o) => o.status === 'cancelled').length;
    const returned = rows.filter((o) => o.status === 'returned').length;

    const methodCounts = new Map<string, number>();
    for (const o of rows) {
      const method = paymentOf(o)?.method ?? 'n/a';
      methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);
    }
    const methodBreakdown =
      [...methodCounts.entries()].map(([method, count]) => `${method}: ${count}`).join('\n') || 'No orders this week';

    const { count: newPartnerCount } = await supabaseAdmin
      .from('partners')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since);

    await postDiscordEmbed(
      DISCORD_REPORTS_WEBHOOK_URL,
      '📊 Weekly Order Management Report',
      [
        { name: 'Total Orders', value: String(rows.length), inline: true },
        { name: 'Revenue (Paid)', value: formatPHP(totalRevenue), inline: true },
        { name: 'New Partner Applications', value: String(newPartnerCount ?? 0), inline: true },
        { name: 'Pending Verification', value: String(pendingVerification), inline: true },
        { name: 'COD Outstanding', value: String(codOutstanding), inline: true },
        { name: 'To Pack', value: String(toPack), inline: true },
        { name: 'To Ship', value: String(toShip), inline: true },
        { name: 'Shipped Out / For Delivery', value: String(shippedOut), inline: true },
        { name: 'Delivered', value: String(delivered), inline: true },
        { name: 'Cancelled', value: String(cancelled), inline: true },
        { name: 'Returned to Seller', value: String(returned), inline: true },
        { name: 'By Payment Method', value: methodBreakdown },
      ],
      {
        description: 'Covering the last 7 days.',
        url: `https://admin.${BARE_HOST}/admin`,
      },
    );

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

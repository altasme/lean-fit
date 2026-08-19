// Supabase Edge Function - sends partner-side confirmation emails via Resend.
// Mirrors send-order-email's structure (same Resend call shape, same
// secrets) but reads from `partners` instead of `orders`/`payments`, kept
// as its own function rather than folded into send-order-email since the
// two tables/event sets don't overlap.
//
// Invoked by the client right after a successful package payment submission
// (`event: "package_payment_submitted"`) - see src/lib/notify.ts.
//
// Secrets required (set with `supabase secrets set KEY=value`):
//   RESEND_API_KEY, EMAIL_FROM, SUPABASE_SERVICE_ROLE_KEY
// SUPABASE_URL is provided automatically in the Edge Function runtime.
//
// See src/content/emails.ts's PARTNER_EMAILS for the copy this mirrors
// (kept in sync manually - same convention as send-order-email/emails.ts).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'Lean & Fit <orders@leanandfit.ph>';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

type PartnerEmailEvent = 'package_payment_submitted';

const PARTNER_TYPE_LABELS: Record<string, string> = {
  reseller: 'Reseller',
  distributor: 'Distributor',
  franchise: 'Franchise',
};

const CUSTOMER_SUBJECTS: Record<PartnerEmailEvent, () => string> = {
  package_payment_submitted: () => 'Lean & Fit Partner Application - Payment Received',
};

function renderCustomerBody(event: PartnerEmailEvent, partner: Record<string, unknown>): string {
  const name = partner.full_name as string;
  const typeLabel = PARTNER_TYPE_LABELS[partner.partner_type as string] ?? 'Partner';

  switch (event) {
    case 'package_payment_submitted':
      return `<p>Hi ${name},</p><p>Thanks for applying to become a Lean & Fit <strong>${typeLabel}</strong> partner. We've received your package payment and our team is reviewing it now. Once it's verified, you'll get a separate email with your partner portal login details and referral code.</p>`;
    default:
      return `<p>Hi ${name}, there's an update on your Lean & Fit partner application.</p>`;
  }
}

async function sendResendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - skipping email send.', { to, subject });
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error (${res.status}): ${text}`);
  }
}

Deno.serve(async (req) => {
  try {
    const { partnerId, event: rawEvent } = await req.json();
    if (!partnerId || !rawEvent) {
      return new Response(JSON.stringify({ error: 'partnerId and event are required' }), {
        status: 400,
      });
    }

    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single();

    if (partnerError || !partner) {
      return new Response(JSON.stringify({ error: 'Partner not found' }), { status: 404 });
    }

    const event = rawEvent as PartnerEmailEvent;
    const subjectFn = CUSTOMER_SUBJECTS[event];

    if (subjectFn) {
      await sendResendEmail(partner.email, subjectFn(), renderCustomerBody(event, partner));
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

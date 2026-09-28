import type { ReactNode } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';

// Plain-language reference for the admin panel and partner portal - client
// request: "explain everything... in a customer level understanding, no
// technical jargon." This is documentation, not a content file other
// pages read from, so it's written directly here rather than split into
// content/ (that split exists so the CLIENT can edit locked marketing
// facts without touching code - this page is the opposite: it's the
// explanation OF the code's behavior, kept next to the thing it explains
// so it's easy to keep in sync as features change).

type Section = { id: string; title: string; body: ReactNode };

function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-lf-cream/80">{children}</p>;
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-lf-cream/80">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Term({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <p className="font-medium text-lf-white">{term}</p>
      <p className="text-sm leading-relaxed text-lf-cream/70">{children}</p>
    </div>
  );
}

const SECTIONS: Section[] = [
  {
    id: 'orders',
    title: 'Orders - The Order List',
    body: (
      <>
        <P>
          The <strong>Orders</strong> page (the page you land on when you log in) is every order a
          customer has placed, newest first. Each row shows the order number, who bought it, how
          much, how they're paying, whether that payment has come through, where the order is in
          fulfillment, and when it was placed.
        </P>
        <P>
          The coloured cards at the top are shortcuts - click one (like "Pending Verification" or
          "To Pack") to instantly filter the list down to just those orders. Click it again to go
          back to seeing everything.
        </P>
        <P>
          Use the search box and dropdowns above the table to find a specific order by name,
          mobile number, or email, narrow the list to one order status or payment status, or look
          at a specific month. The "Export CSV" button downloads whatever you're currently looking
          at as a spreadsheet file.
        </P>
        <P>
          Rows with a gold "COD" tag are Cash on Delivery orders - the customer hasn't paid
          anything yet, they'll pay the courier when it arrives. These are flagged so you don't
          mistake an unpaid COD order for a payment problem.
        </P>
        <P>
          Click any order number to open its full details, where you actually process it (see
          "Managing a Single Order" below). "+ Add Order" lets you manually create an order
          yourself - useful for a phone or walk-in order, or a wholesale restock for an existing
          partner.
        </P>
      </>
    ),
  },
  {
    id: 'two-statuses',
    title: 'The Two Statuses, Explained',
    body: (
      <>
        <P>
          Every order actually has <strong>two separate statuses</strong> that move independently
          of each other. This trips people up at first, so it's worth understanding clearly:
        </P>
        <Term term="Order Status - where the order is in fulfillment">
          Pending → Confirmed → Packing → Shipped → Completed. (Or Cancelled / Returned if
          something goes wrong.) This is about the physical box of coffee - has it been packed,
          has it left the building, has it arrived.
        </Term>
        <Term term="Payment Status - whether the money has actually come in">
          Pending → Paid (or Pending Verification → Paid/Rejected for methods that need a manual
          check). This is purely about the money, and has nothing to do with whether the box has
          shipped yet.
        </Term>
        <P>
          Why two? Because they genuinely don't always move together. A Cash on Delivery order is
          "Confirmed" and ready to pack immediately, even though it hasn't been paid for yet - the
          payment only happens when the courier hands it over. A GCash/Maya/Online Banking order,
          on the other hand, is usually paid instantly (before it's even "Confirmed"), but the box
          still has to go through the same Packing → Shipped → Completed steps as any other order.
        </P>
        <P>
          One rule to remember: the moment a payment actually clears, an order sitting at
          "Pending" automatically jumps to "Confirmed" for you - you don't have to do that step
          by hand.
        </P>
      </>
    ),
  },
  {
    id: 'order-detail',
    title: 'Managing a Single Order',
    body: (
      <>
        <P>
          Opening an order shows everything about it - the customer's details, what they bought,
          the delivery address, and a payment panel that looks the same no matter how they paid
          (so you're never guessing where to look). Below that are the action buttons, which
          change depending on where the order currently stands.
        </P>
        <Term term="If they paid by GCash, Maya, or Bank Transfer">
          The customer uploaded a screenshot as proof. Open it, check it matches the amount and
          reference number shown, then click <strong>Approve Payment</strong> (this also moves the
          order to "Confirmed" automatically) or <strong>Reject Payment</strong> if something's
          off - the customer gets an email either way, and if rejected they can fix it and try
          again.
        </Term>
        <Term term="If they paid through our payment partner (GCash/Maya/Online Banking checkout)">
          This one usually settles itself within seconds - no action needed from you. If a
          customer insists they paid but the order still shows unpaid, click{' '}
          <strong>Check Ganap Status</strong> ("Ganap" is the name of the payment partner that runs
          this checkout) to ask them directly. Only use{' '}
          <strong>Mark Paid Manually (Bypass Ganap)</strong> if the customer genuinely paid you
          outside of that checkout (e.g. sent you GCash directly) - it skips the usual check
          entirely.
        </Term>
        <Term term="If it's Cash on Delivery">
          Nothing to verify up front - it's already "Confirmed" and ready to pack. Once the
          courier has delivered it and collected the cash, come back and click{' '}
          <strong>Mark As Delivered (Cash Collected)</strong>, which marks it both paid and
          completed in one step.
        </Term>
        <Term term="Moving the box along">
          Once payment is sorted (or it's a Cash on Delivery order), click{' '}
          <strong>Move To Packing</strong>, then fill in the courier name and tracking number and
          click <strong>Mark As Shipped</strong> - the customer gets an email with that tracking
          info. Once it's arrived, click <strong>Mark As Completed</strong> (or the "Cash
          Collected" button above, for COD).
        </Term>
        <Term term="If something goes wrong">
          <strong>Mark As Return To Seller (RTS)</strong> is for a shipped order the courier
          couldn't deliver. <strong>Refund Payment</strong> records that money already paid was sent back
          (the actual refund happens outside the system, e.g. a GCash transfer - this just logs
          that it happened). <strong>Cancel Order</strong> is for stopping an order before it
          ships. Every one of these sends the customer an update automatically.
        </Term>
      </>
    ),
  },
  {
    id: 'partners',
    title: 'Partners - Applications & Approval',
    body: (
      <>
        <P>
          The <strong>Partners</strong> page lists everyone who wants to (or already does) resell
          Lean & Fit. There are three kinds of partners, based on how much territory and volume
          they take on:
        </P>
        <List
          items={[
            <>
              <strong>Reseller</strong> - sells within a single barangay.
            </>,
            <>
              <strong>Distributor</strong> - covers a whole city, usually buys in bigger volume.
            </>,
            <>
              <strong>Franchise</strong> - covers an entire region, the biggest commitment.
            </>,
          ]}
        />
        <P>Every partner moves through the same four buckets, shown as tabs on this page:</P>
        <List
          items={[
            <>
              <strong>Pending</strong> - someone just applied. Nothing's been reviewed yet.
            </>,
            <>
              <strong>Onboarding</strong> - you're actively working with them (choosing their
              package, collecting their payment, deciding their territory) but they aren't live
              yet.
            </>,
            <>
              <strong>Active</strong> - fully approved, can log into their own Partner Portal, and
              is out there selling.
            </>,
            <>
              <strong>Inactive / Suspended</strong> - was active but has been paused or turned
              down.
            </>,
          ]}
        />
        <P>A gold dot next to a name means you haven't opened that application yet.</P>
        <Term term="Reviewing an application">
          Open a pending application to see their details. If it needs more work before a
          decision (setting up their package, territory, or payment), click{' '}
          <strong>Move To Onboarding</strong>. Once everything checks out, click{' '}
          <strong>Approve</strong> - this activates them, generates their personal referral link,
          and sends them an email to set up their portal password. <strong>Reject</strong> at any
          point ends the application with a polite email.
        </Term>
        <Term term="Upline / Downline">
          Larger partners can have smaller partners working under them (for example, a
          Distributor overseeing several Resellers in their city). On a partner's page you can
          assign who supplies them ("upline") - their own team ("downline") shows automatically
          once that's set.
        </Term>
        <Term term="Suspend / Reactivate">
          Already-active partners can be temporarily suspended (they keep their account but stop
          appearing as available) or reactivated later, without losing their history.
        </Term>
      </>
    ),
  },
  {
    id: 'commission-pricing',
    title: 'Partner Pricing & Commission',
    body: (
      <>
        <P>
          Each partner type (Reseller, Distributor, Franchise) buys at its own discounted price
          per box, set on the <strong>Partner Pricing</strong> page - change a number there and it
          applies to that whole tier going forward.
        </P>
        <P>
          When a partner shares their personal referral link and someone buys through it, that
          sale shows up as a "Client Order" for them, and they earn a commission on it - visible
          as "Pending Commission" on the Partners list, and broken down in full on each partner's
          own page. A commission only becomes actually payable once that order is fully{' '}
          <strong>Completed</strong> (delivered) - not the moment it's placed, since an order that
          gets cancelled or returned was never really a sale.
        </P>
        <P>
          Paying a partner their commission happens outside this system (bank transfer, GCash,
          etc.) - once you've paid them, record it on their page so the running total stays
          accurate and you don't double-pay later.
        </P>
      </>
    ),
  },
  {
    id: 'products-promos',
    title: 'Products & Promotions',
    body: (
      <>
        <P>
          <strong>Products</strong> is where the actual product listing lives - name, price,
          description, photos. Changing something here changes what customers see on the website
          immediately.
        </P>
        <P>
          <strong>Promotions</strong> covers discounts - either a straight price cut on a product,
          or a code customers type in at checkout (a percentage off, or a fixed peso amount off).
          Turn a promotion on or off, or set it to expire, right from this page.
        </P>
      </>
    ),
  },
  {
    id: 'top-sellers',
    title: 'Top Sellers',
    body: (
      <P>
        A simple leaderboard ranking partners by how much they've sold. Partners see a version of
        this too (see the Partner Portal section below) - it's meant to be a friendly bit of
        competition, not a performance review.
      </P>
    ),
  },
  {
    id: 'staff',
    title: 'Staff Accounts (User Management)',
    body: (
      <>
        <P>
          Only visible to full admins. This is where you add other people who need to help run
          things day-to-day, without handing them the keys to everything.
        </P>
        <P>
          When you add someone, you choose exactly what they're allowed to touch - Products,
          Promotions, and/or Partner Pricing. Orders and Partners are always visible to every
          staff account, since that's the core day-to-day work; the optional permissions are for
          the more sensitive, money-affecting settings. A full admin (that's you) can see and do
          everything, with no restrictions.
        </P>
      </>
    ),
  },
  {
    id: 'audit-log',
    title: 'Audit Log',
    body: (
      <P>
        A running history of who changed what and when - a payment approved, an order cancelled, a
        partner suspended, a price changed. Nothing here can be edited or deleted; it's purely a
        record to look back on if you ever need to answer "what happened to this order" or "who
        approved this partner."
      </P>
    ),
  },
  {
    id: 'partner-portal',
    title: 'The Partner Portal - What Your Partners See',
    body: (
      <>
        <P>
          Once a partner is approved, they log into their own separate dashboard - they never see
          your admin panel, only their own information. Understanding what they see helps when
          they call asking "where do I find...":
        </P>
        <Term term="Overview">
          Their profile, their personal referral link (which they share to earn sales), and who
          they're connected to upline/downline.
        </Term>
        <Term term="Top Sellers">The same leaderboard mentioned above, from their point of view.</Term>
        <Term term="Client Orders">
          Every sale made through their referral link - these are the orders that earn them
          commission.
        </Term>
        <Term term="My Orders">
          Lets the partner buy stock for themselves at their own discounted tier price, right from
          their dashboard (there's a minimum order size per partner type). They pay the same way a
          retail customer does, through our payment partner.
        </Term>
        <Term term="Customers">
          A simple list of the people who've bought through their link, so they can see who to
          follow up with.
        </Term>
        <Term term="Commission">
          Their own running earnings total, split into what's payable (order delivered), what's
          still pending (order placed but not yet delivered), and what didn't count (cancelled or
          returned).
        </Term>
        <Term term="Marketing Materials">
          Ready-made images and captions they can post on social media to help them sell.
        </Term>
      </>
    ),
  },
  {
    id: 'glossary',
    title: 'Quick Glossary',
    body: (
      <>
        <P>Plain-English meaning of every status badge you'll see around the admin panel:</P>
        <Term term="Order Status">
          <strong>Pending</strong> - just placed, nothing confirmed yet ·{' '}
          <strong>Confirmed</strong> - payment sorted (or it's Cash on Delivery), ready to pack ·{' '}
          <strong>Packing</strong> - being boxed up · <strong>Shipped</strong> - with the courier ·{' '}
          <strong>Completed</strong> - delivered · <strong>Cancelled</strong> - stopped before
          shipping · <strong>Returned</strong> - courier couldn't deliver it.
        </Term>
        <Term term="Payment Status">
          <strong>Pending</strong> - not paid yet · <strong>Pending Verification</strong> - proof
          uploaded, waiting on you to check it · <strong>Paid</strong> - confirmed received ·{' '}
          <strong>Rejected</strong> - proof didn't check out, customer needs to fix it ·{' '}
          <strong>Failed</strong> - the payment attempt didn't go through ·{' '}
          <strong>Refunded</strong> - money was sent back · <strong>Cancelled</strong> - no longer
          relevant (order was cancelled).
        </Term>
        <Term term="Partner Status">
          <strong>Pending</strong> - new application · <strong>Onboarding</strong> - being set up
          · <strong>Active</strong> - live and selling · <strong>Suspended</strong> - paused ·{' '}
          <strong>Rejected</strong> - application turned down.
        </Term>
      </>
    ),
  },
];

export default function AdminHelp() {
  return (
    <AdminLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">
        Help &amp; Documentation
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-lf-cream/70">
        A plain-English guide to everything in the admin panel and the Partner Portal - no
        technical terms, just what each page and button actually does.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2 rounded-sm border border-white/10 bg-lf-charcoal p-4">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-lf-cream/70 transition-colors hover:border-lf-gold/40 hover:text-lf-gold"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <div className="mt-8 space-y-6">
        {SECTIONS.map((s) => (
          <section
            key={s.id}
            id={s.id}
            className="scroll-mt-24 rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8"
          >
            <h2 className="font-kicker text-lg uppercase tracking-wide2 text-lf-gold">
              {s.title}
            </h2>
            {s.body}
          </section>
        ))}
      </div>
    </AdminLayout>
  );
}

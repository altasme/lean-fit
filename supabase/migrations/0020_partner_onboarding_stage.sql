-- Lean & Fit - explicit "Onboarding" partner stage.
-- Client request: separate a raw new lead ("New") from a lead that's
-- actively being onboarded, with its own visible bucket beside Pending
-- in the admin Partners list, and a "notification" (unread count) for
-- brand-new pending applications. Paste after 0019.
--
-- New pipeline: New (pending) -> [admin clicks "Move to Onboarding"] ->
-- Onboarding (no data required yet) -> [admin fills in the existing
-- "Complete Onboarding" form: type/territory/package/payment] -> Active
-- (if activated immediately, the form's default) or stays in Onboarding
-- awaiting a separate "Approve Partner" click (if payment wasn't
-- confirmed yet) - approve_partner() already sets status unconditionally
-- to 'active' with no status filter, so it needs no change here.

alter type partner_status add value if not exists 'onboarding';

-- "Viewed" tracking for the Pending notification badge - set once an
-- admin opens a still-'pending' partner's detail page (AdminPartnerDetail.tsx).
-- Nullable/unset for every existing row, same as this codebase's other
-- "add a column, backfill nothing, let it fill in going forward" columns
-- (e.g. admin_users.email/full_name in migration 0014).
alter table partners add column first_viewed_at timestamptz;

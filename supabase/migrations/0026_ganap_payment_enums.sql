-- Lean & Fit - Ganap payment gateway integration (client request): checkout
-- payment methods become "GCash / Maya / Online Banking" (via Ganap's
-- hosted QR Ph checkout) and "Cash On Delivery" - the three separate
-- manual GCash/Maya/Bank Transfer methods (with proof-of-payment upload)
-- are retired from the active checkout config in favor of this one
-- automated method. Historical orders placed under the old methods keep
-- their data untouched - 'gcash'/'maya'/'bank_transfer'/'manual' stay in
-- both enums forever (Postgres can't drop enum values anyway, and there's
-- no reason to - admin still needs to render old orders correctly).
--
-- Isolated in its own migration/paste on purpose: Postgres won't let a
-- value just added via `ALTER TYPE ... ADD VALUE` be referenced by
-- anything created later in the SAME transaction, on every Postgres
-- version/client (this bit migrations 0020/0021 earlier in this project -
-- same fix applies here). Migration 0027 (which uses 'ganap' inside
-- create_order_with_payment) must be pasted as a separate run, after this
-- one has fully committed.

alter type payment_method add value if not exists 'ganap';
alter type payment_provider add value if not exists 'ganap';

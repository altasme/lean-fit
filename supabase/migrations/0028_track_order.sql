-- Lean & Fit - public order tracking (client request): a "Track My Order"
-- link in the footer, where a customer enters their order number or
-- shipping tracking number and sees their order's status - no login.
--
-- `orders`/`payments` have no anon SELECT policy at all (CLAUDE.md §11 -
-- anon can only INSERT, via create_order_with_payment) precisely to avoid
-- exposing customer PII to an unauthenticated query. This is the same
-- "narrow SECURITY DEFINER RPC" pattern already used for get_invite_info
-- (migration 0025): the function runs with elevated privilege but returns
-- only a hand-picked, non-sensitive projection - never a raw row.
--
-- Deliberately excluded from the response: customer_name, email, mobile,
-- address, and every monetary field (unit_price/subtotal/total). order_no
-- is sequential (LF-000123) and therefore guessable/enumerable - unlike
-- get_invite_info's random invite codes, this cannot rely on the lookup
-- key itself being unguessable, so the response is kept to exactly what a
-- parcel-tracking page needs (fulfillment/payment status, courier,
-- tracking number, what was ordered) and nothing that identifies the
-- buyer or what they paid. If this becomes a concern later, the standard
-- fix is requiring a second factor (e.g. order number + email) - not
-- implemented here since the client's ask was just "order number or
-- tracking number," but flagged in supabase/README.md for awareness.

create or replace function track_order(p_query text) returns table (
  order_no text,
  status order_status,
  payment_status payment_status,
  product text,
  quantity int,
  courier text,
  tracking_number text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_query text := upper(trim(coalesce(p_query, '')));
begin
  if v_query = '' then
    return;
  end if;

  return query
    select o.order_no, o.status, p.status, o.product, o.quantity,
           o.courier, o.tracking_number, o.created_at, o.updated_at
    from orders o
    left join payments p on p.order_id = o.id
    where upper(o.order_no) = v_query
       or (o.tracking_number is not null and upper(o.tracking_number) = v_query)
    order by o.created_at desc
    limit 1;
end;
$$;

grant execute on function track_order to anon, authenticated;

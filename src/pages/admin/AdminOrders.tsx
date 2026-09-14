import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { OrderStats } from '../../components/admin/OrderStats';
import { matchesQuickFilter } from '../../lib/orderQuickFilter';
import type { OrderQuickFilter } from '../../lib/orderQuickFilter';
import { listOrders } from '../../lib/adminOrders';
import type { OrderWithPayment } from '../../lib/adminOrders';
import { formatPHP } from '../../lib/format';
import { downloadCsv } from '../../lib/csv';
import { ORDER_STATUS_EMOJI, ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from '../../types/order';
import type { OrderStatus, OrderType } from '../../types/order';
import { PAYMENT_STATUS_EMOJI, PAYMENT_STATUS_LABELS } from '../../types/payment';
import type { PaymentStatus } from '../../types/payment';

const METHOD_LABELS: Record<string, string> = {
  gcash: 'GCash',
  maya: 'Maya',
  bank_transfer: 'Bank Transfer',
  cod: 'COD',
};

const QUICK_FILTER_LABELS: Record<OrderQuickFilter, string> = {
  all: 'All',
  pending_verification: 'Pending Verification',
  cod_outstanding: 'COD Outstanding',
  paid_revenue: 'Revenue (Paid)',
  to_pack: 'To Pack',
  to_ship: 'To Ship',
  shipped_out: 'Shipped Out / For Delivery',
  delivered: 'Delivered',
};

const PAGE_SIZE = 20;

type SortKey = 'order_no' | 'customer_name' | 'total' | 'created_at';
type SortDir = 'asc' | 'desc';

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderWithPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState<OrderStatus | 'all'>('all');
  const [orderType, setOrderType] = useState<OrderType | 'all'>('all');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // 'all' or 'YYYY-MM' - client request: view/filter the dashboard and
  // table month by month.
  const [month, setMonth] = useState<string>('all');
  // Stat cards double as one-click filters (client request) - independent
  // of the dropdowns above, and mutually exclusive with them (picking a
  // dropdown value clears this, and vice versa) so the two mechanisms
  // never silently combine into a confusing empty result.
  const [quickFilter, setQuickFilter] = useState<OrderQuickFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .catch((err) => setError(err.message));
  }, []);

  const availableMonths = useMemo(() => {
    if (!orders) return [];
    const months = new Set(orders.map((o) => o.created_at.slice(0, 7)));
    return [...months].sort((a, b) => (a < b ? 1 : -1));
  }, [orders]);

  function monthLabel(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  }

  // Scoped by month only - this is what the stat cards count against, so
  // they read as "this month's numbers" regardless of what the table's
  // own dropdown filters/search are doing.
  const monthFiltered = useMemo(() => {
    if (!orders) return [];
    if (month === 'all') return orders;
    return orders.filter((o) => o.created_at.slice(0, 7) === month);
  }, [orders, month]);

  function selectQuickFilter(next: OrderQuickFilter) {
    setQuickFilter(next);
    if (next !== 'all') {
      setOrderStatus('all');
      setPaymentStatus('all');
    }
    resetPage();
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return monthFiltered.filter((order) => {
      if (term) {
        const haystack =
          `${order.order_no} ${order.customer_name} ${order.mobile} ${order.email}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (orderStatus !== 'all' && order.status !== orderStatus) return false;
      if (orderType !== 'all' && order.order_type !== orderType) return false;
      if (paymentStatus !== 'all' && order.payment?.status !== paymentStatus) return false;
      if (!matchesQuickFilter(order, quickFilter)) return false;
      const orderDate = order.created_at.slice(0, 10);
      if (dateFrom && orderDate < dateFrom) return false;
      if (dateTo && orderDate > dateTo) return false;
      return true;
    });
  }, [monthFiltered, search, orderStatus, orderType, paymentStatus, quickFilter, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'total') return (a.total - b.total) * dir;
      return a[sortKey] < b[sortKey] ? -dir : a[sortKey] > b[sortKey] ? dir : 0;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetPage() {
    setPage(1);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function handleExport() {
    downloadCsv(
      `lean-fit-orders-${new Date().toISOString().slice(0, 10)}.csv`,
      sorted.map((order) => ({
        'Order No': order.order_no,
        Type: ORDER_TYPE_LABELS[order.order_type],
        Customer: order.customer_name,
        Email: order.email,
        Mobile: order.mobile,
        Amount: order.total,
        Method: order.payment ? (METHOD_LABELS[order.payment.method] ?? order.payment.method) : '',
        'Payment Status': order.payment
          ? (PAYMENT_STATUS_LABELS[order.payment.status] ?? order.payment.status)
          : '',
        'Order Status': ORDER_STATUS_LABELS[order.status],
        Date: new Date(order.created_at).toLocaleDateString('en-PH'),
      })),
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Orders</h1>
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              resetPage();
            }}
            className="rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
          >
            <option value="all">All Time</option>
            {availableMonths.map((ym) => (
              <option key={ym} value={ym}>
                {monthLabel(ym)}
              </option>
            ))}
          </select>
          <Link to="/admin/orders/new" className="btn-gold !px-4 !py-2 !text-sm">
            + Add Order
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}
      {!orders && !error && <p className="mt-4 text-sm text-lf-cream/60">Loading orders…</p>}

      {orders && (
        <>
          <div className="mt-6">
            <OrderStats orders={monthFiltered} activeFilter={quickFilter} onSelectFilter={selectQuickFilter} />
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="block font-kicker text-xs uppercase tracking-wide2 text-lf-cream/60">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                placeholder="Order #, customer, mobile, email"
                className="mt-1 w-full rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-kicker text-xs uppercase tracking-wide2 text-lf-cream/60">
                Order Status
              </label>
              <select
                value={orderStatus}
                onChange={(e) => {
                  setOrderStatus(e.target.value as OrderStatus | 'all');
                  setQuickFilter('all');
                  resetPage();
                }}
                className="mt-1 rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
              >
                <option value="all">All</option>
                {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-kicker text-xs uppercase tracking-wide2 text-lf-cream/60">
                Order Type
              </label>
              <select
                value={orderType}
                onChange={(e) => {
                  setOrderType(e.target.value as OrderType | 'all');
                  resetPage();
                }}
                className="mt-1 rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
              >
                <option value="all">All</option>
                {(Object.keys(ORDER_TYPE_LABELS) as OrderType[]).map((t) => (
                  <option key={t} value={t}>
                    {ORDER_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-kicker text-xs uppercase tracking-wide2 text-lf-cream/60">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => {
                  setPaymentStatus(e.target.value as PaymentStatus | 'all');
                  setQuickFilter('all');
                  resetPage();
                }}
                className="mt-1 rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
              >
                <option value="all">All</option>
                {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {PAYMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-kicker text-xs uppercase tracking-wide2 text-lf-cream/60">
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  resetPage();
                }}
                className="mt-1 rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-kicker text-xs uppercase tracking-wide2 text-lf-cream/60">
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  resetPage();
                }}
                className="mt-1 rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
              />
            </div>

            <button type="button" onClick={handleExport} className="btn-outline !px-4 !py-2 !text-sm">
              Export CSV
            </button>
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-lf-cream/50">
            <span>
              {sorted.length} order{sorted.length === 1 ? '' : 's'}
              {sorted.length !== monthFiltered.length ? ` (of ${monthFiltered.length} total)` : ''}
              {month !== 'all' ? ` in ${monthLabel(month)}` : ''}
            </span>
            {quickFilter !== 'all' && (
              <button
                type="button"
                onClick={() => selectQuickFilter('all')}
                className="rounded-full border border-lf-gold/40 bg-lf-gold/10 px-2.5 py-1 text-lf-gold hover:bg-lf-gold/20"
              >
                Filter: {QUICK_FILTER_LABELS[quickFilter]} ×
              </button>
            )}
          </p>

          {sorted.length === 0 ? (
            <p className="mt-4 text-sm text-lf-cream/60">No orders match these filters.</p>
          ) : (
            <div className="tabular mt-2 overflow-x-auto rounded-sm border border-white/10">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-lf-charcoal text-xs uppercase tracking-wide2 text-lf-cream/60">
                  <tr>
                    <SortableHeader label="Order" sortKey="order_no" active={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortableHeader
                      label="Customer"
                      sortKey="customer_name"
                      active={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHeader label="Amount" sortKey="total" active={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Payment Status</th>
                    <th className="px-4 py-3">Order Status</th>
                    <SortableHeader
                      label="Date"
                      sortKey="created_at"
                      active={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((order) => {
                    const isCod = order.payment?.method === 'cod';
                    return (
                      <tr
                        key={order.id}
                        className={`border-t border-white/5 hover:bg-white/5 ${isCod ? 'bg-lf-gold/5' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <Link to={`/admin/orders/${order.id}`} className="text-lf-gold hover:underline">
                            {order.order_no}
                          </Link>
                          {order.order_type !== 'retail' && (
                            <span className="ml-1.5 rounded-full border border-lf-gold/40 px-1.5 py-0.5 text-[10px] text-lf-gold">
                              {ORDER_TYPE_LABELS[order.order_type]}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-lf-white">{order.customer_name}</td>
                        <td className="px-4 py-3 text-lf-white">{formatPHP(order.total)}</td>
                        <td className="px-4 py-3 text-lf-cream/70">
                          <span className="whitespace-nowrap">
                            {order.payment ? METHOD_LABELS[order.payment.method] : '—'}
                            {isCod && (
                              <span className="ml-1.5 rounded-full border border-lf-gold/40 px-1.5 py-0.5 text-[10px] text-lf-gold">
                                COD
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {order.payment ? (
                            <span className="whitespace-nowrap">
                              {PAYMENT_STATUS_EMOJI[order.payment.status]}{' '}
                              {PAYMENT_STATUS_LABELS[order.payment.status]}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="whitespace-nowrap">
                            {ORDER_STATUS_EMOJI[order.status]} {ORDER_STATUS_LABELS[order.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-lf-cream/60">
                          {new Date(order.created_at).toLocaleDateString('en-PH')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="font-kicker uppercase tracking-wide2 text-lf-cream/70 hover:text-lf-gold disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="text-lf-cream/60">
                Page {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => p + 1)}
                className="font-kicker uppercase tracking-wide2 text-lf-cream/70 hover:text-lf-gold disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}

function SortableHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = active === sortKey;
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 uppercase tracking-wide2 ${isActive ? 'text-lf-gold' : ''}`}
      >
        {label}
        {isActive && <span>{dir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

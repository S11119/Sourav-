import Link from 'next/link';
import { loadDashboardData } from '@/lib/dashboard';
import { formatDate, formatMoney } from '@/lib/date';
import { whatsappConfigured } from '@/lib/whatsapp';
import {
  markDelivered,
  pauseToday,
  resetDemo,
  resolveComplaint,
  togglePaid,
  undoDelivered,
} from './actions';

export const dynamic = 'force-dynamic';

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default async function DashboardPage() {
  const data = await loadDashboardData();
  const { stats } = data;
  const wa = whatsappConfigured();
  const todayLabel = formatDate(data.today, 'english');

  const deliveredToday = data.todayRows.filter((r) => r.delivery.status === 'delivered').length;
  const pausedToday = data.todayRows.filter((r) => r.delivery.status === 'paused').length;
  const openComplaints = data.complaints.filter((c) => c.complaint.status === 'open');

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <span className="dot" /> Owner dashboard
          </div>
          <h1>Today&apos;s route · {todayLabel}</h1>
          <p>
            {data.todayRows.length} stops · {deliveredToday} delivered
            {pausedToday > 0 ? ` · ${pausedToday} paused` : ''} · dues {formatMoney(stats.dues)}
          </p>
        </div>
        <div className="chip-row">
          <span className="chip">
            <span className="dot" />
            <strong>{data.mode === 'supabase' ? 'Supabase' : 'Local demo store'}</strong>
          </span>
          <span className="chip">
            <span className={`dot ${wa ? '' : 'warn'}`} />
            {wa ? 'WhatsApp live' : 'WhatsApp sandbox'}
          </span>
          <Link href="/chat" className="btn small secondary">
            Open chat demo
          </Link>
          <form action={resetDemo} className="inline">
            <button type="submit" className="btn small ghost">
              Reset demo data
            </button>
          </form>
        </div>
      </div>

      <section className="grid stats">
        <div className="stat accent">
          <div className="label">Units today</div>
          <div className="value">{stats.litresToday}</div>
          <div className="hint">litres + kg across the route</div>
        </div>
        <div className="stat">
          <div className="label">Revenue today</div>
          <div className="value">{formatMoney(stats.revenueToday)}</div>
          <div className="hint">marked delivered</div>
        </div>
        <div className="stat">
          <div className="label">Collected · 7 days</div>
          <div className="value">{formatMoney(stats.revenue7d)}</div>
          <div className="hint">paid deliveries</div>
        </div>
        <div className="stat">
          <div className="label">Dues</div>
          <div className="value" style={{ color: stats.dues > 0 ? 'var(--red)' : undefined }}>
            {formatMoney(stats.dues)}
          </div>
          <div className="hint">{data.duesRows.length} customer(s) pending</div>
        </div>
        <div className="stat">
          <div className="label">Subscriptions</div>
          <div className="value">{stats.activeSubscriptions}</div>
          <div className="hint">{stats.customers} customers total</div>
        </div>
        <div className="stat">
          <div className="label">Open complaints</div>
          <div className="value">{stats.openComplaints}</div>
          <div className="hint">incl. call-back requests</div>
        </div>
      </section>

      <section className="grid two section">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Delivery run</h3>
              <p className="sub">{todayLabel} · 5:00–7:30 AM</p>
            </div>
            <span className="badge">{data.todayRows.length} stops</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Item</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.todayRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty">
                      No deliveries generated for today.
                    </td>
                  </tr>
                )}
                {data.todayRows.map(({ delivery, customer, product }) => (
                  <tr key={delivery.id}>
                    <td>
                      <div className="customer-cell">
                        <span className="avatar">{initials(customer?.name)}</span>
                        <div>
                          {customer?.name ?? customer?.wa_id}
                          <small>{customer?.address ?? 'Address pending'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {product?.name ?? 'Item'} · {delivery.qty} {product?.unit}
                      {delivery.status === 'paused' && (
                        <small className="muted" style={{ display: 'block' }}>
                          paused for today
                        </small>
                      )}
                    </td>
                    <td className="num">{formatMoney(delivery.amount)}</td>
                    <td>
                      <span
                        className={`badge ${
                          delivery.status === 'delivered'
                            ? ''
                            : delivery.status === 'paused'
                              ? 'amber'
                              : delivery.status === 'cancelled'
                                ? 'red'
                                : 'grey'
                        }`}
                      >
                        {delivery.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {delivery.status === 'scheduled' && (
                          <>
                            <form action={markDelivered} className="inline">
                              <input type="hidden" name="id" value={delivery.id} />
                              <button className="btn small" type="submit">
                                Delivered
                              </button>
                            </form>
                            {customer && (
                              <form action={pauseToday} className="inline">
                                <input type="hidden" name="customerId" value={customer.id} />
                                <button className="btn small ghost" type="submit">
                                  Skip
                                </button>
                              </form>
                            )}
                          </>
                        )}
                        {delivery.status === 'delivered' && (
                          <>
                            <form action={togglePaid} className="inline">
                              <input type="hidden" name="id" value={delivery.id} />
                              <button className="btn small secondary" type="submit">
                                {delivery.paid ? 'Mark unpaid' : 'Mark paid'}
                              </button>
                            </form>
                            <form action={undoDelivered} className="inline">
                              <input type="hidden" name="id" value={delivery.id} />
                              <button className="btn small ghost" type="submit">
                                Undo
                              </button>
                            </form>
                          </>
                        )}
                        {delivery.status === 'delivered' && delivery.paid && (
                          <span className="badge">paid</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Pending dues</h3>
                <p className="sub">Unpaid delivered items</p>
              </div>
              <span className="badge amber">{formatMoney(stats.dues)}</span>
            </div>
            {data.duesRows.length === 0 && <p className="empty">All payments clear 🎉</p>}
            {data.duesRows.map((row) => (
              <div className="kv" key={row.customer.id}>
                <span>
                  {row.customer.name ?? row.customer.wa_id}
                  <small className="muted" style={{ display: 'block' }}>
                    {row.count} deliveries · since {formatDate(row.oldest, 'english')}
                  </small>
                </span>
                <strong>{formatMoney(row.amount)}</strong>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3>Complaints &amp; call-backs</h3>
                <p className="sub">{openComplaints.length} open</p>
              </div>
              <span className={`badge ${openComplaints.length ? 'red' : ''}`}>
                {openComplaints.length}
              </span>
            </div>
            {openComplaints.length === 0 && <p className="empty">Nothing open. Sab theek 👍</p>}
            {openComplaints.slice(0, 6).map(({ complaint, customer }) => (
              <div className="kv" key={complaint.id}>
                <span>
                  <span className={`badge ${complaint.kind === 'handoff' ? 'amber' : 'red'}`}>
                    {complaint.kind === 'handoff' ? 'callback' : 'complaint'}
                  </span>{' '}
                  {customer?.name ?? customer?.wa_id}
                  <small className="muted" style={{ display: 'block' }}>
                    {complaint.body}
                  </small>
                </span>
                <form action={resolveComplaint} className="inline">
                  <input type="hidden" name="id" value={complaint.id} />
                  <button className="btn small secondary" type="submit">
                    Resolve
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card section">
        <div className="card-head">
          <div>
            <h3>Active subscriptions</h3>
            <p className="sub">What each customer gets, every day or on schedule</p>
          </div>
          <Link href="/chat" className="link">
            Add via chat →
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Product</th>
                <th className="num">Qty</th>
                <th>Frequency</th>
                <th>Since</th>
                <th className="num">Per day</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.activeOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    No active subscriptions yet.
                  </td>
                </tr>
              )}
              {data.activeOrders.map(({ order, customer, product }) => (
                <tr key={order.id}>
                  <td>{customer?.name ?? customer?.wa_id}</td>
                  <td>{product?.name ?? '—'}</td>
                  <td className="num">
                    {order.qty} {product?.unit}
                  </td>
                  <td>{order.frequency}</td>
                  <td className="muted">{formatDate(order.start_date, 'english')}</td>
                  <td className="num">{formatMoney(order.qty * order.unit_price)}</td>
                  <td>
                    <span className={`badge ${order.status === 'paused' ? 'amber' : ''}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid two section">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Next 6 days</h3>
              <p className="sub">Generated from active subscriptions, pauses excluded</p>
            </div>
          </div>
          {data.upcoming.map((day) => {
            const units = day.rows
              .filter((r) => r.delivery.status !== 'paused')
              .reduce((sum, r) => sum + r.delivery.qty, 0);
            const amount = day.rows
              .filter((r) => r.delivery.status !== 'paused')
              .reduce((sum, r) => sum + r.delivery.amount, 0);
            return (
              <div className="kv" key={day.date}>
                <span>
                  {formatDate(day.date, 'english')}
                  <small className="muted" style={{ display: 'block' }}>
                    {day.rows.length} stops · {units} units
                  </small>
                </span>
                <strong>{formatMoney(amount)}</strong>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Customers</h3>
              <p className="sub">WhatsApp numbers and saved language</p>
            </div>
            <span className="badge">{data.customers.length}</span>
          </div>
          <div className="table-wrap">
            <table>
              <tbody>
                {data.customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="customer-cell">
                        <span className="avatar">{initials(c.name)}</span>
                        <div>
                          {c.name ?? 'New customer'}
                          <small>+{c.wa_id}</small>
                        </div>
                      </div>
                    </td>
                    <td className="muted small">{c.lang}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

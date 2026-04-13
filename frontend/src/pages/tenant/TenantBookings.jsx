import { useState, useEffect } from 'react';
import { bookingAPI, paymentAPI, maintenanceAPI } from '../../services/api';
import { DashboardLayout, SidebarNav, StatusBadge, EmptyState, Modal, PageLoader } from '../../components/common';
import PaymentForm from '../../components/payment/PaymentForm';
import toast from 'react-hot-toast';

const SIDEBAR_LINKS = [
  { to: '/tenant', icon: '📊', label: 'Overview' },
  { to: '/tenant/bookings', icon: '📅', label: 'My Bookings' },
  { to: '/tenant/payments', icon: '💳', label: 'Payments' },
  { to: '/tenant/maintenance', icon: '🔧', label: 'Maintenance' },
  { to: '/', icon: '🔍', label: 'Browse Properties' },
];

export function TenantBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(null);
  const [cancelId, setCancelId] = useState(null);

  const load = () => {
    setLoading(true);
    bookingAPI.getAll().then(r => setBookings(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCancel = async (id) => {
    try {
      await bookingAPI.updateStatus(id, { status: 'cancelled', cancellation_reason: 'Cancelled by tenant' });
      toast.success('Booking cancelled');
      load();
    } catch { toast.error('Failed to cancel'); }
    setCancelId(null);
  };

  if (loading) return <PageLoader />;

  return (
    <DashboardLayout sidebar={<SidebarNav links={SIDEBAR_LINKS} role="tenant" />}>
      <div>
        <h1 className="font-display text-2xl text-gray-900 mb-6">My Bookings</h1>
        {bookings.length === 0 ? (
          <EmptyState icon="📭" title="No bookings yet" description="Browse properties and make your first booking" />
        ) : (
          <div className="space-y-4">
            {bookings.map(b => (
              <div key={b.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{b.property_title}</h3>
                    <p className="text-sm text-gray-500 mt-1">📍 {b.property_location}</p>
                    <p className="text-sm text-gray-500">📅 {b.check_in} → {b.check_out} ({b.total_days} days)</p>
                    <p className="text-sm font-semibold text-primary-700 mt-1">₹{Number(b.total_amount).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={b.status} />
                    {b.status === 'confirmed' && !b.payment_status && (
                      <button onClick={() => setPayModal(b)} className="btn-primary text-xs px-3 py-1.5">Pay Now</button>
                    )}
                    {b.status === 'pending' && (
                      <button onClick={() => setCancelId(b.id)} className="text-xs text-red-500 hover:underline">Cancel</button>
                    )}
                    {b.payment_status === 'completed' && <span className="text-xs text-green-600 font-medium">✓ Paid</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Complete Payment">
        {payModal && <PaymentForm booking={payModal} onSuccess={() => { setPayModal(null); load(); }} />}
      </Modal>

      <Modal open={!!cancelId} onClose={() => setCancelId(null)} title="Cancel Booking" size="sm">
        <p className="text-gray-600 mb-4">Are you sure you want to cancel this booking?</p>
        <div className="flex gap-3">
          <button onClick={() => setCancelId(null)} className="btn-secondary flex-1">Keep Booking</button>
          <button onClick={() => handleCancel(cancelId)} className="btn-danger flex-1">Yes, Cancel</button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

export function TenantPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentAPI.getHistory().then(r => setPayments(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <DashboardLayout sidebar={<SidebarNav links={SIDEBAR_LINKS} role="tenant" />}>
      <h1 className="font-display text-2xl text-gray-900 mb-6">Payment History</h1>
      {payments.length === 0 ? (
        <EmptyState icon="💳" title="No payments yet" description="Payments will appear here after booking" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Property', 'Period', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.property_title}</td>
                  <td className="px-4 py-3 text-gray-500">{p.check_in} → {p.check_out}</td>
                  <td className="px-4 py-3 font-bold text-primary-700">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-gray-500">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}

export function TenantMaintenance() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ property_id: '', title: '', description: '', category: 'other', priority: 'medium' });
  const [submitting, setSubmitting] = useState(false);
  const [bookings, setBookings] = useState([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      maintenanceAPI.getAll(),
      bookingAPI.getAll({ status: 'confirmed' }),
    ]).then(([mRes, bRes]) => {
      setRequests(mRes.data.data);
      setBookings(bRes.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.property_id) { toast.error('Select a property'); return; }
    setSubmitting(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    try {
      await maintenanceAPI.create(fd);
      toast.success('Request submitted!');
      setModal(false);
      setForm({ property_id: '', title: '', description: '', category: 'other', priority: 'medium' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  const priorityColor = { low: 'badge-gray', medium: 'badge-yellow', high: 'badge-red', urgent: 'badge-red' };

  if (loading) return <PageLoader />;

  return (
    <DashboardLayout sidebar={<SidebarNav links={SIDEBAR_LINKS} role="tenant" />}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-gray-900">Maintenance Requests</h1>
        <button onClick={() => setModal(true)} className="btn-primary text-sm">+ New Request</button>
      </div>

      {requests.length === 0 ? (
        <EmptyState icon="🔧" title="No requests yet" description="Submit a maintenance request for your rental property" />
      ) : (
        <div className="space-y-4">
          {requests.map(r => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{r.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">📍 {r.property_title}</p>
                  <p className="text-sm text-gray-600 mt-1">{r.description}</p>
                  {r.owner_notes && <p className="text-sm text-primary-600 mt-2 bg-primary-50 rounded-lg px-3 py-2">💬 Owner: {r.owner_notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={r.status} />
                  <span className={priorityColor[r.priority] || 'badge-gray'}>{r.priority}</span>
                  <span className="text-xs text-gray-400 capitalize">{r.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New Maintenance Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Property</label>
            <select required className="input" value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })}>
              <option value="">Select active property</option>
              {bookings.map(b => <option key={b.id} value={b.property_id}>{b.property_title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
            <input required className="input" placeholder="e.g. Leaking faucet" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <textarea required rows={3} className="input resize-none" placeholder="Describe the issue..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
              <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'other'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Submitting...' : 'Submit Request'}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

export default TenantBookings;

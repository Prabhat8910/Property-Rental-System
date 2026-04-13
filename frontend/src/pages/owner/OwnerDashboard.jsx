import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { propertyAPI, bookingAPI, paymentAPI, maintenanceAPI } from '../../services/api';
import { DashboardLayout, SidebarNav, StatusBadge, EmptyState, Modal, PageLoader } from '../../components/common';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const SIDEBAR_LINKS = [
  { to: '/owner', icon: '📊', label: 'Overview' },
  { to: '/owner/properties', icon: '🏠', label: 'My Properties' },
  { to: '/owner/bookings', icon: '📅', label: 'Bookings' },
  { to: '/', icon: '🔍', label: 'View Listings' },
];

export function OwnerDashboard() {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      propertyAPI.getMyProperties(),
      bookingAPI.getAll({ limit: 5 }),
      maintenanceAPI.getAll({ limit: 5 }),
    ]).then(([pRes, bRes, mRes]) => {
      setProperties(pRes.data.data);
      setBookings(bRes.data.data);
      setMaintenance(mRes.data.data.filter(r => r.status === 'open'));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalRevenue = properties.reduce((s, p) => s + Number(p.total_revenue || 0), 0);
  const activeBookings = bookings.filter(b => b.status === 'confirmed').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;

  if (loading) return <PageLoader />;

  return (
    <DashboardLayout sidebar={<SidebarNav links={SIDEBAR_LINKS} role="owner" />}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl text-gray-900">Owner Dashboard 🏢</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your properties and bookings</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '🏠', label: 'Properties', val: properties.length, color: 'text-blue-600' },
            { icon: '✅', label: 'Active Bookings', val: activeBookings, color: 'text-green-600' },
            { icon: '⏳', label: 'Pending Approval', val: pendingBookings, color: 'text-amber-600' },
            { icon: '💰', label: 'Total Revenue', val: `₹${Number(totalRevenue).toLocaleString('en-IN')}`, color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="card p-5 text-center">
              <p className="text-3xl mb-2">{s.icon}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent bookings needing action */}
        {pendingBookings > 0 && (
          <div className="card p-6 border-l-4 border-amber-400">
            <h2 className="font-semibold text-gray-900 mb-4">⏳ Bookings Awaiting Approval ({pendingBookings})</h2>
            <div className="space-y-3">
              {bookings.filter(b => b.status === 'pending').slice(0, 3).map(b => (
                <PendingBookingCard key={b.id} booking={b} onAction={() => {
                  bookingAPI.getAll({ limit: 5 }).then(r => setBookings(r.data.data));
                }} />
              ))}
            </div>
            <Link to="/owner/bookings" className="text-sm text-primary-600 hover:underline mt-3 inline-block">View all bookings →</Link>
          </div>
        )}

        {/* Maintenance alerts */}
        {maintenance.length > 0 && (
          <div className="card p-6 border-l-4 border-red-400">
            <h2 className="font-semibold text-gray-900 mb-4">🔧 Open Maintenance Requests ({maintenance.length})</h2>
            <div className="space-y-2">
              {maintenance.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{r.title}</p>
                    <p className="text-xs text-gray-500">{r.property_title} · {r.tenant_name}</p>
                  </div>
                  <span className={`badge ${r.priority === 'urgent' || r.priority === 'high' ? 'badge-red' : 'badge-yellow'}`}>{r.priority}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Properties summary */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Properties Performance</h2>
            <Link to="/owner/properties" className="text-sm text-primary-600 hover:underline">Manage →</Link>
          </div>
          {properties.length === 0 ? (
            <EmptyState icon="🏠" title="No properties yet" description="List your first property to start earning" action={<Link to="/owner/properties" className="btn-primary text-sm">+ Add Property</Link>} />
          ) : (
            <div className="space-y-3">
              {properties.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{p.title}</p>
                    <p className="text-xs text-gray-500">{p.city} · {p.active_bookings} active booking(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-700 text-sm">₹{Number(p.total_revenue || 0).toLocaleString('en-IN')}</p>
                    <StatusBadge status={p.is_available ? 'active' : 'inactive'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function PendingBookingCard({ booking: b, onAction }) {
  const [loading, setLoading] = useState(false);

  const handle = async (status) => {
    setLoading(true);
    try {
      await bookingAPI.updateStatus(b.id, { status });
      toast.success(`Booking ${status}`);
      onAction();
    } catch { toast.error('Action failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-wrap items-center justify-between bg-amber-50 rounded-xl p-3 gap-3">
      <div>
        <p className="font-medium text-gray-800 text-sm">{b.property_title}</p>
        <p className="text-xs text-gray-500">👤 {b.tenant_name} · {b.check_in} → {b.check_out}</p>
        <p className="text-xs font-semibold text-primary-700">₹{Number(b.total_amount).toLocaleString('en-IN')}</p>
      </div>
      <div className="flex gap-2">
        <button disabled={loading} onClick={() => handle('confirmed')} className="btn-primary text-xs px-3 py-1.5">✓ Approve</button>
        <button disabled={loading} onClick={() => handle('rejected')} className="btn-danger text-xs px-3 py-1.5">✗ Reject</button>
      </div>
    </div>
  );
}

export function OwnerProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editProp, setEditProp] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', location: '', city: '', state: '', price: '', price_type: 'per_month', property_type: 'apartment', bedrooms: 1, bathrooms: 1, area_sqft: '', amenities: '' });

  const load = () => {
    setLoading(true);
    propertyAPI.getMyProperties().then(r => setProperties(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openEdit = (p) => {
    setEditProp(p);
    setForm({ title: p.title, description: p.description || '', location: p.location, city: p.city, state: p.state || '', price: p.price, price_type: p.price_type, property_type: p.property_type, bedrooms: p.bedrooms, bathrooms: p.bathrooms, area_sqft: p.area_sqft || '', amenities: (JSON.parse(p.amenities || '[]')).join(', ') });
    setModal(true);
  };

  const openCreate = () => {
    setEditProp(null);
    setForm({ title: '', description: '', location: '', city: '', state: '', price: '', price_type: 'per_month', property_type: 'apartment', bedrooms: 1, bathrooms: 1, area_sqft: '', amenities: '' });
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData();
    const amenitiesArr = form.amenities.split(',').map(s => s.trim()).filter(Boolean);
    Object.entries({ ...form, amenities: JSON.stringify(amenitiesArr) }).forEach(([k, v]) => fd.append(k, v));
    try {
      if (editProp) {
        await propertyAPI.update(editProp.id, fd);
        toast.success('Property updated!');
      } else {
        await propertyAPI.create(fd);
        toast.success('Property listed!');
      }
      setModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this property?')) return;
    try { await propertyAPI.delete(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const toggleAvailability = async (p) => {
    const fd = new FormData();
    fd.append('is_available', !p.is_available);
    try { await propertyAPI.update(p.id, fd); load(); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <PageLoader />;

  return (
    <DashboardLayout sidebar={<SidebarNav links={SIDEBAR_LINKS} role="owner" />}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-gray-900">My Properties</h1>
        <button onClick={openCreate} className="btn-primary text-sm">+ Add Property</button>
      </div>

      {properties.length === 0 ? (
        <EmptyState icon="🏠" title="No properties yet" description="Add your first property to start receiving bookings" action={<button onClick={openCreate} className="btn-primary">+ Add Property</button>} />
      ) : (
        <div className="space-y-4">
          {properties.map(p => (
            <div key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{p.title}</h3>
                    <StatusBadge status={p.is_available ? 'active' : 'inactive'} />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">📍 {p.city}, {p.state}</p>
                  <p className="text-sm text-gray-600">💰 ₹{Number(p.price).toLocaleString('en-IN')}/{p.price_type?.replace('per_', '')} · 🛏 {p.bedrooms}bd · 🚿 {p.bathrooms}ba</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>📅 {p.total_bookings} bookings</span>
                    <span>✅ {p.active_bookings} active</span>
                    <span>💰 ₹{Number(p.total_revenue || 0).toLocaleString('en-IN')} revenue</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => toggleAvailability(p)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${p.is_available ? 'border-gray-200 text-gray-600 hover:bg-gray-50' : 'border-green-300 text-green-600 hover:bg-green-50'}`}>
                    {p.is_available ? 'Mark Unavailable' : 'Mark Available'}
                  </button>
                  <button onClick={() => openEdit(p)} className="text-xs btn-secondary px-3 py-1.5">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editProp ? 'Edit Property' : 'Add New Property'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Title *</label>
              <input required className="input" placeholder="2BHK Modern Apartment in Bandra" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Location *</label>
              <input required className="input" placeholder="Bandra West, Mumbai" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">City *</label>
              <input required className="input" placeholder="Mumbai" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">State</label>
              <input className="input" placeholder="Maharashtra" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Price (₹) *</label>
              <input required type="number" className="input" placeholder="25000" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Price Type</label>
              <select className="input" value={form.price_type} onChange={e => setForm({...form, price_type: e.target.value})}>
                <option value="per_month">Per Month</option>
                <option value="per_day">Per Day</option>
                <option value="per_week">Per Week</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Property Type</label>
              <select className="input" value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})}>
                {['apartment','house','villa','studio','commercial'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Area (sqft)</label>
              <input type="number" className="input" placeholder="950" value={form.area_sqft} onChange={e => setForm({...form, area_sqft: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Bedrooms</label>
              <input type="number" min={1} className="input" value={form.bedrooms} onChange={e => setForm({...form, bedrooms: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Bathrooms</label>
              <input type="number" min={1} className="input" value={form.bathrooms} onChange={e => setForm({...form, bathrooms: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Amenities (comma-separated)</label>
              <input className="input" placeholder="WiFi, Parking, Gym, Swimming Pool" value={form.amenities} onChange={e => setForm({...form, amenities: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
              <textarea rows={3} className="input resize-none" placeholder="Describe the property..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving...' : editProp ? 'Update Property' : 'Add Property'}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

export function OwnerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = () => {
    setLoading(true);
    bookingAPI.getAll(filter ? { status: filter } : {}).then(r => setBookings(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filter]);

  const handleAction = async (id, status) => {
    try {
      await bookingAPI.updateStatus(id, { status });
      toast.success(`Booking ${status}`);
      load();
    } catch { toast.error('Failed'); }
  };

  if (loading) return <PageLoader />;

  return (
    <DashboardLayout sidebar={<SidebarNav links={SIDEBAR_LINKS} role="owner" />}>
      <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
        <h1 className="font-display text-2xl text-gray-900">Bookings</h1>
        <select className="input w-auto" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Status</option>
          {['pending','confirmed','completed','cancelled','rejected'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {bookings.length === 0 ? (
        <EmptyState icon="📅" title="No bookings" description="Bookings for your properties will appear here" />
      ) : (
        <div className="space-y-4">
          {bookings.map(b => (
            <div key={b.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{b.property_title}</h3>
                  <p className="text-sm text-gray-600 mt-1">👤 {b.tenant_name} · 📧 {b.tenant_email}</p>
                  <p className="text-sm text-gray-500">📅 {b.check_in} → {b.check_out} ({b.total_days} days)</p>
                  <p className="font-semibold text-primary-700 text-sm mt-1">₹{Number(b.total_amount).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={b.status} />
                  {b.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(b.id, 'confirmed')} className="btn-primary text-xs px-3 py-1.5">✓ Approve</button>
                      <button onClick={() => handleAction(b.id, 'rejected')} className="btn-danger text-xs px-3 py-1.5">✗ Reject</button>
                    </div>
                  )}
                  {b.status === 'confirmed' && (
                    <button onClick={() => handleAction(b.id, 'completed')} className="btn-secondary text-xs px-3 py-1.5">Mark Complete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

export default OwnerDashboard;

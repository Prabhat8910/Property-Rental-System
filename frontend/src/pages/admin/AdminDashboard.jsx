import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { DashboardLayout, SidebarNav, StatusBadge, PageLoader } from '../../components/common';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

const SIDEBAR_LINKS = [
  { to: '/admin', icon: '📊', label: 'Dashboard' },
  { to: '/admin/users', icon: '👥', label: 'Users' },
  { to: '/admin/properties', icon: '🏠', label: 'Properties' },
  { to: '/', icon: '🔍', label: 'View Site' },
];

export function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboard().then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return null;

  return (
    <DashboardLayout sidebar={<SidebarNav links={SIDEBAR_LINKS} role="admin" />}>
      <div className="space-y-6">
        <h1 className="font-display text-2xl text-gray-900">Admin Dashboard 🛡️</h1>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '👥', label: 'Total Users', val: data.users.total, sub: `${data.users.owners} owners, ${data.users.tenants} tenants`, color: 'text-blue-600' },
            { icon: '🏠', label: 'Properties', val: data.properties.total, sub: `${data.properties.available} available`, color: 'text-green-600' },
            { icon: '📅', label: 'Bookings', val: data.bookings.total, sub: `${data.bookings.confirmed} confirmed`, color: 'text-purple-600' },
            { icon: '💰', label: 'Revenue', val: `₹${Number(data.payments.revenue).toLocaleString('en-IN')}`, sub: `${data.payments.total} transactions`, color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{s.icon}</span>
                <span className={`text-2xl font-bold ${s.color}`}>{s.val}</span>
              </div>
              <p className="font-semibold text-gray-700 text-sm">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        {data.monthlyRevenue?.length > 0 && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Monthly Revenue</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Maintenance alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Maintenance Status</h2>
            <div className="space-y-2">
              {[
                { label: 'Open', val: data.maintenance.open, color: 'text-red-600' },
                { label: 'In Progress', val: data.maintenance.in_progress, color: 'text-amber-600' },
                { label: 'Total', val: data.maintenance.total, color: 'text-gray-700' },
              ].map(m => (
                <div key={m.label} className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-2 text-sm">
                  <span className="text-gray-600">{m.label}</span>
                  <span className={`font-bold ${m.color}`}>{m.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Recent Bookings</h2>
            <div className="space-y-2">
              {data.recentBookings?.slice(0,4).map(b => (
                <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 text-xs">
                  <div>
                    <p className="font-medium text-gray-800">{b.tenant_name}</p>
                    <p className="text-gray-400">{b.property_title?.slice(0,25)}...</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const load = () => {
    setLoading(true);
    adminAPI.getUsers({ search, role: roleFilter }).then(r => setUsers(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search, roleFilter]);

  const handleToggle = async (id, name, isActive) => {
    if (!confirm(`${isActive ? 'Deactivate' : 'Activate'} user ${name}?`)) return;
    try { await adminAPI.toggleUser(id); toast.success('User status updated'); load(); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <PageLoader />;

  return (
    <DashboardLayout sidebar={<SidebarNav links={SIDEBAR_LINKS} role="admin" />}>
      <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
        <h1 className="font-display text-2xl text-gray-900">User Management</h1>
        <div className="flex gap-2">
          <input className="input w-48 text-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input w-auto text-sm" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="owner">Owners</option>
            <option value="tenant">Tenants</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">{u.name?.[0]}</div>
                    <span className="font-medium text-gray-800">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 capitalize">
                  <span className={`badge ${u.role === 'owner' ? 'badge-blue' : 'badge-green'}`}>{u.role}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(u.id, u.name, u.is_active)} className={`text-xs px-3 py-1 rounded-lg border ${u.is_active ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-500 hover:bg-green-50'}`}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="text-center py-10 text-gray-400">No users found</div>}
      </div>
    </DashboardLayout>
  );
}

export function AdminProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    adminAPI.getProperties({ status: statusFilter }).then(r => setProperties(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, [statusFilter]);

  if (loading) return <PageLoader />;

  return (
    <DashboardLayout sidebar={<SidebarNav links={SIDEBAR_LINKS} role="admin" />}>
      <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
        <h1 className="font-display text-2xl text-gray-900">All Properties</h1>
        <select className="input w-auto text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Title', 'Owner', 'City', 'Price', 'Type', 'Available', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {properties.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{p.title}</td>
                <td className="px-4 py-3 text-gray-500">{p.owner_name}</td>
                <td className="px-4 py-3 text-gray-500">{p.city}</td>
                <td className="px-4 py-3 font-semibold text-primary-700">₹{Number(p.price).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 capitalize text-gray-500">{p.property_type}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.is_available ? 'active' : 'inactive'} />
                </td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {properties.length === 0 && <div className="text-center py-10 text-gray-400">No properties found</div>}
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;

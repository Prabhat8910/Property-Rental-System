import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingAPI, paymentAPI, maintenanceAPI, notificationAPI } from '../../services/api';
import { DashboardLayout, SidebarNav, StatusBadge, PageLoader } from '../../components/common';

const SIDEBAR_LINKS = [
  { to: '/tenant', icon: '📊', label: 'Overview' },
  { to: '/tenant/bookings', icon: '📅', label: 'My Bookings' },
  { to: '/tenant/payments', icon: '💳', label: 'Payments' },
  { to: '/tenant/maintenance', icon: '🔧', label: 'Maintenance' },
  { to: '/', icon: '🔍', label: 'Browse Properties' },
];

export default function TenantDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ bookings: 0, activeBookings: 0, totalPaid: 0, openRequests: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      bookingAPI.getAll({ limit: 5 }),
      paymentAPI.getHistory({ limit: 3 }),
      maintenanceAPI.getAll({ limit: 3 }),
      notificationAPI.getAll(),
    ]).then(([bookRes, payRes, maintRes, notifRes]) => {
      const bookings = bookRes.data.data;
      const payments = payRes.data.data;
      setRecentBookings(bookings.slice(0, 5));
      setNotifications(notifRes.data.data.slice(0, 5));
      setStats({
        bookings: bookRes.data.pagination.total,
        activeBookings: bookings.filter(b => b.status === 'confirmed').length,
        totalPaid: payments.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0),
        openRequests: maintRes.data.data.filter(r => r.status === 'open').length,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <DashboardLayout sidebar={<SidebarNav links={SIDEBAR_LINKS} role="tenant" />}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl text-gray-900">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-gray-500 text-sm mt-1">Here's what's happening with your rentals</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '📅', label: 'Total Bookings', val: stats.bookings, color: 'text-blue-600' },
            { icon: '✅', label: 'Active Bookings', val: stats.activeBookings, color: 'text-green-600' },
            { icon: '💰', label: 'Total Paid', val: `₹${Number(stats.totalPaid).toLocaleString('en-IN')}`, color: 'text-purple-600' },
            { icon: '🔧', label: 'Open Requests', val: stats.openRequests, color: 'text-orange-600' },
          ].map(s => (
            <div key={s.label} className="card p-5 text-center">
              <p className="text-3xl mb-2">{s.icon}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent bookings */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
            <Link to="/tenant/bookings" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          {recentBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm">No bookings yet. <Link to="/" className="text-primary-600 hover:underline">Browse properties</Link></p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{b.property_title}</p>
                    <p className="text-xs text-gray-500">{b.check_in} → {b.check_out}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={b.status} />
                    <p className="text-xs text-gray-600 mt-1">₹{Number(b.total_amount).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Notifications</h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No notifications</p>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <div key={n.id} className={`p-3 rounded-xl text-sm ${n.is_read ? 'bg-gray-50' : 'bg-blue-50 border border-blue-100'}`}>
                  <p className="font-medium text-gray-800">{n.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

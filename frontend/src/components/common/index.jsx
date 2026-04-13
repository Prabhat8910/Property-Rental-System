// Spinner
export function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8';
  return <div className={`animate-spin rounded-full border-b-2 border-primary-600 ${s}`} />;
}

// Page loader
export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

// Empty state
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon || '📭'}</div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      {description && <p className="text-gray-500 text-sm mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

// Star rating display
export function StarRating({ rating, size = 'sm' }) {
  const s = size === 'lg' ? 'text-xl' : 'text-sm';
  return (
    <span className={`${s} flex items-center gap-0.5`}>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}>★</span>
      ))}
    </span>
  );
}

// Status badge
export function StatusBadge({ status }) {
  const map = {
    confirmed: 'badge-green', pending: 'badge-yellow', cancelled: 'badge-red',
    completed: 'badge-blue', rejected: 'badge-red', open: 'badge-yellow',
    in_progress: 'badge-blue', resolved: 'badge-green', closed: 'badge-gray',
    active: 'badge-green', inactive: 'badge-gray',
  };
  return <span className={map[status] || 'badge-gray'}>{status?.replace('_', ' ')}</span>;
}

// Modal
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${widths[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Sidebar layout for dashboards
export function DashboardLayout({ sidebar, children }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        <aside className="w-64 flex-shrink-0 hidden lg:block">{sidebar}</aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

// Sidebar nav
export function SidebarNav({ links, role }) {
  const { pathname } = window.location;
  const roleColors = { admin: 'bg-purple-600', owner: 'bg-blue-600', tenant: 'bg-green-600' };
  return (
    <div className="card p-4">
      <div className={`${roleColors[role] || 'bg-primary-600'} rounded-xl p-4 mb-4 text-white text-center`}>
        <p className="font-semibold capitalize">{role} Panel</p>
      </div>
      <nav className="space-y-1">
        {links.map(({ to, icon, label }) => (
          <a key={to} href={to} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${pathname === to ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <span className="text-base">{icon}</span> {label}
          </a>
        ))}
      </nav>
    </div>
  );
}

// Confirm dialog
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

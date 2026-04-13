import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiHome, FiMenu, FiX, FiBell, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import { notificationAPI } from '../../services/api';
import { useEffect } from 'react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      notificationAPI.getAll().then(res => setUnread(res.data.unreadCount)).catch(() => {});
    }
  }, [isAuthenticated, location.pathname]);

  const dashboardLink = user?.role === 'admin' ? '/admin' : user?.role === 'owner' ? '/owner' : '/tenant';

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <FiHome className="text-white text-sm" />
            </div>
            <span className="font-display text-xl text-gray-900">NestFinder</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Properties</Link>
            {isAuthenticated ? (
              <>
                <Link to={dashboardLink} className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Dashboard</Link>
                {/* Notifications */}
                <button className="relative text-gray-500 hover:text-primary-600" onClick={() => navigate(dashboardLink)}>
                  <FiBell size={20} />
                  {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{unread}</span>}
                </button>
                {/* User dropdown */}
                <div className="relative">
                  <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl transition-colors">
                    {user?.avatar ? <img src={user.avatar} className="w-7 h-7 rounded-full object-cover" /> : <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">{user?.name?.[0]}</div>}
                    <span className="text-sm font-medium text-gray-700">{user?.name?.split(' ')[0]}</span>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                      </div>
                      <Link to={dashboardLink} onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <FiSettings size={14} /> Dashboard
                      </Link>
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <FiLogOut size={14} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="btn-secondary text-sm px-4 py-2">Login</Link>
                <Link to="/register" className="btn-primary text-sm px-4 py-2">Get Started</Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 space-y-2">
            <Link to="/" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg">Properties</Link>
            {isAuthenticated ? (
              <>
                <Link to={dashboardLink} onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg">Dashboard</Link>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg">Login</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg font-medium">Register</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

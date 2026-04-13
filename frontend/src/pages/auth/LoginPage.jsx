import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'owner') navigate('/owner');
      else navigate('/tenant');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const fillDemo = (role) => {
    const demos = { admin: { email: 'admin@rental.com', password: 'Password123!' }, owner: { email: 'owner1@rental.com', password: 'Password123!' }, tenant: { email: 'tenant1@rental.com', password: 'Password123!' } };
    setForm(demos[role]);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 mt-2">Sign in to your NestFinder account</p>
        </div>

        {/* Demo credentials */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-blue-700 mb-2">🔑 Demo Accounts (click to fill)</p>
          <div className="flex gap-2 flex-wrap">
            {['admin', 'owner', 'tenant'].map(r => (
              <button key={r} onClick={() => fillDemo(r)} className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1 rounded-lg capitalize hover:bg-blue-100 transition-colors">{r}</button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="email" required className="input pl-10" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type={showPw ? 'text' : 'password'} required className="input pl-10 pr-10" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Don't have an account? <Link to="/register" className="text-primary-600 font-medium hover:underline">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'tenant', phone: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(form);
      toast.success('Account created successfully!');
      if (user.role === 'owner') navigate('/owner');
      else navigate('/tenant');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-2">Join NestFinder today</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {['tenant', 'owner'].map(r => (
              <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all capitalize ${form.role === r ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {r === 'tenant' ? '🏠 I\'m a Tenant' : '🏢 I\'m an Owner'}
              </button>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name</label>
            <input type="text" required className="input" placeholder="Rahul Sharma" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
            <input type="email" required className="input" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</label>
            <input type="tel" className="input" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} required minLength={6} className="input pr-10" placeholder="Min 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;

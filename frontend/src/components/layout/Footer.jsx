import { Link } from 'react-router-dom';
import { FiHome, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 pt-12 pb-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <FiHome className="text-white text-sm" />
              </div>
              <span className="font-display text-xl text-white">NestFinder</span>
            </div>
            <p className="text-sm leading-relaxed">India's trusted property rental platform connecting landlords and tenants seamlessly.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Browse Properties</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">List Your Property</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Tenant Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><FiMail size={14} /> support@nestfinder.in</li>
              <li className="flex items-center gap-2"><FiPhone size={14} /> +91-800-NEST-123</li>
              <li className="flex items-center gap-2"><FiMapPin size={14} /> Mumbai, India</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 text-center text-xs">
          © {new Date().getFullYear()} NestFinder. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

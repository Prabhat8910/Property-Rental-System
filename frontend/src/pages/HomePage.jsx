import { useState, useEffect } from 'react';
import { propertyAPI } from '../services/api';
import PropertyCard from '../components/property/PropertyCard';
import PropertySearch from '../components/property/PropertySearch';
import { PageLoader } from '../components/common';
import { FiArrowRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const STATS = [
  { label: 'Properties Listed', value: '10,000+' },
  { label: 'Happy Tenants', value: '25,000+' },
  { label: 'Cities Covered', value: '50+' },
  { label: 'Trusted Owners', value: '5,000+' },
];

export default function HomePage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);

  const fetchProperties = async (f = filters, p = 1) => {
    setLoading(true);
    try {
      const res = await propertyAPI.getAll({ ...f, page: p, limit: 9 });
      setProperties(res.data.data);
      setPagination(res.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchProperties(); }, []);

  const handleSearch = (f) => { setFilters(f); setPage(1); fetchProperties(f, 1); };
  const handlePageChange = (p) => { setPage(p); fetchProperties(filters, p); window.scrollTo(0, 400); };

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <span className="inline-block bg-white/20 backdrop-blur text-sm font-semibold px-4 py-1.5 rounded-full mb-6">🏠 India's #1 Rental Platform</span>
          <h1 className="font-display text-5xl md:text-6xl mb-6 leading-tight">
            Find Your Perfect<br /><span className="text-accent-500">Home Away</span> From Home
          </h1>
          <p className="text-primary-200 text-lg max-w-xl mx-auto mb-10">
            Discover thousands of verified rental properties across India. Transparent pricing, secure payments, hassle-free renting.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#listings" className="btn-primary bg-white text-primary-700 hover:bg-gray-100 flex items-center gap-2">
              Browse Properties <FiArrowRight />
            </a>
            <Link to="/register" className="btn-secondary bg-transparent border-white text-white hover:bg-white/10">
              List Your Property
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map(s => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-primary-700">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Listings */}
      <section id="listings" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-display text-gray-900">Available Properties</h2>
            {pagination.total && <p className="text-sm text-gray-500 mt-1">{pagination.total} properties found</p>}
          </div>
        </div>

        <PropertySearch filters={filters} onChange={setFilters} onSearch={handleSearch} />

        {loading ? (
          <PageLoader />
        ) : properties.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🔍</p>
            <h3 className="text-lg font-semibold text-gray-800">No properties found</h3>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your search filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map(p => <PropertyCard key={p.id} property={p} onWishlistToggle={() => fetchProperties()} />)}
            </div>
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${p === page ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-400'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* CTA */}
      <section className="bg-primary-50 py-16">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="font-display text-3xl text-gray-900 mb-4">Own a Property? Start Earning Today</h2>
          <p className="text-gray-600 mb-8">List your property on NestFinder and reach thousands of verified tenants across India.</p>
          <Link to="/register" className="btn-primary inline-flex items-center gap-2">Get Started Free <FiArrowRight /></Link>
        </div>
      </section>
    </div>
  );
}

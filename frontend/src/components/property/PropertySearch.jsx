import { useState } from 'react';
import { FiSearch, FiSliders, FiX } from 'react-icons/fi';

const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Noida', 'Gurugram', 'Ahmedabad'];
const TYPES = ['apartment', 'house', 'villa', 'studio', 'commercial'];

export default function PropertySearch({ filters, onChange, onSearch }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key, value) => onChange({ ...filters, [key]: value });
  const handleClear = () => { onChange({}); onSearch({}); };

  const hasFilters = Object.values(filters).some(v => v !== '' && v !== undefined);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8">
      {/* Main search bar */}
      <div className="flex gap-3 flex-wrap md:flex-nowrap">
        <div className="relative flex-1 min-w-0">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by title, location, description..."
            value={filters.search || ''}
            onChange={e => handleChange('search', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch(filters)}
            className="input pl-10"
          />
        </div>
        <select className="input w-auto min-w-[140px]" value={filters.city || ''} onChange={e => handleChange('city', e.target.value)}>
          <option value="">All Cities</option>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => onSearch(filters)} className="btn-primary whitespace-nowrap">
          Search
        </button>
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="btn-secondary flex items-center gap-2 whitespace-nowrap">
          <FiSliders size={16} /> Filters
          {hasFilters && <span className="bg-primary-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">!</span>}
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Property Type</label>
            <select className="input text-sm" value={filters.property_type || ''} onChange={e => handleChange('property_type', e.target.value)}>
              <option value="">Any Type</option>
              {TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Min Price (₹)</label>
            <input type="number" placeholder="0" className="input text-sm" value={filters.min_price || ''} onChange={e => handleChange('min_price', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Max Price (₹)</label>
            <input type="number" placeholder="Any" className="input text-sm" value={filters.max_price || ''} onChange={e => handleChange('max_price', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Bedrooms</label>
            <select className="input text-sm" value={filters.bedrooms || ''} onChange={e => handleChange('bedrooms', e.target.value)}>
              <option value="">Any</option>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 col-span-2 md:col-span-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input type="checkbox" checked={filters.available === 'true'} onChange={e => handleChange('available', e.target.checked ? 'true' : '')} className="rounded" />
              Available only
            </label>
            {hasFilters && (
              <button onClick={handleClear} className="ml-auto flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
                <FiX size={14} /> Clear filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

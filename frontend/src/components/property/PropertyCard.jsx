import { Link } from 'react-router-dom';
import { FiMapPin, FiHeart, FiStar, FiHome, FiDroplet } from 'react-icons/fi'; // 👈 FiBed → FiHome
import { useState } from 'react';
import { propertyAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function PropertyCard({ property, onWishlistToggle }) {
  const { isAuthenticated } = useAuth();
  const [inWishlist, setInWishlist] = useState(property.inWishlist || false);
  const [loading, setLoading] = useState(false);

  const images = (() => {
    try { return typeof property.images === 'string' ? JSON.parse(property.images) : property.images || []; }
    catch { return []; }
  })();

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error('Please login to save properties'); return; }
    setLoading(true);
    try {
      const res = await propertyAPI.toggleWishlist(property.id);
      setInWishlist(res.data.inWishlist);
      toast.success(res.data.message);
      onWishlistToggle?.();
    } catch { toast.error('Failed to update wishlist'); }
    finally { setLoading(false); }
  };

  const formatPrice = (price, type) => {
    const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
    const labels = { per_month: '/mo', per_day: '/day', per_week: '/wk' };
    return `${formatted}${labels[type] || '/mo'}`;
  };

  return (
    <Link to={`/properties/${property.id}`} className="card hover:shadow-md transition-all duration-200 group block">
      <div className="relative overflow-hidden h-48">
        {images[0] ? (
          <img src={images[0]} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <span className="text-4xl">🏠</span>
          </div>
        )}
        {property.is_featured && (
          <span className="absolute top-3 left-3 bg-accent-500 text-white text-xs font-bold px-2 py-1 rounded-lg">Featured</span>
        )}
        <button
          onClick={handleWishlist}
          disabled={loading}
          className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
        >
          <FiHeart className={inWishlist ? 'text-red-500 fill-red-500' : 'text-gray-400'} size={16} />
        </button>
        <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur text-xs font-semibold px-2 py-1 rounded-lg capitalize">{property.property_type}</span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 flex-1">{property.title}</h3>
        </div>
        <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
          <FiMapPin size={11} />
          <span className="truncate">{property.city}, {property.state}</span>
        </div>
        <div className="flex items-center gap-3 text-gray-500 text-xs mb-3">
          <span className="flex items-center gap-1"><FiHome size={12} />{property.bedrooms} bed</span> {/* 👈 Fix */}
          <span className="flex items-center gap-1"><FiDroplet size={12} />{property.bathrooms} bath</span>
          {property.area_sqft && <span>{property.area_sqft} sqft</span>}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-primary-700 font-bold text-base">{formatPrice(property.price, property.price_type)}</span>
          {property.avg_rating > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <FiStar className="text-amber-400 fill-amber-400" size={12} />
              {parseFloat(property.avg_rating).toFixed(1)}
              <span>({property.total_reviews})</span>
            </span>
          )}
        </div>
        {!property.is_available && (
          <div className="mt-2 text-center bg-red-50 text-red-600 text-xs font-semibold py-1 rounded-lg">Not Available</div>
        )}
      </div>
    </Link>
  );
}
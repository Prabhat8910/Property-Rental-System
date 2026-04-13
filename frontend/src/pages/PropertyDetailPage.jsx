import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyAPI, bookingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageLoader, StarRating, Modal } from '../components/common';
import BookingCalendar from '../components/booking/BookingCalendar';
import toast from 'react-hot-toast';
import { FiMapPin, FiHome, FiDroplet, FiSquare, FiWifi, FiPhone, FiMail, FiHeart, FiShare2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [bookingData, setBookingData] = useState(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);

  useEffect(() => {
    propertyAPI.getOne(id)
      .then(res => { setProperty(res.data.data); setInWishlist(res.data.data.inWishlist); })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (!property) return null;

  const images = (() => { try { return typeof property.images === 'string' ? JSON.parse(property.images) : property.images || []; } catch { return []; } })();
  const amenities = (() => { try { return typeof property.amenities === 'string' ? JSON.parse(property.amenities) : property.amenities || []; } catch { return []; } })();

  const handleBooking = async () => {
    if (!isAuthenticated) { toast.error('Please login to book'); navigate('/login'); return; }
    if (user.role !== 'tenant') { toast.error('Only tenants can make bookings'); return; }
    if (!bookingData) { toast.error('Please select check-in and check-out dates'); return; }
    setBookingLoading(true);
    try {
      await bookingAPI.create({ property_id: property.id, check_in: bookingData.checkIn, check_out: bookingData.checkOut });
      toast.success('Booking request sent! Check your dashboard.');
      setBookingModal(false);
      navigate('/tenant/bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally { setBookingLoading(false); }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) { toast.error('Please login'); return; }
    try {
      const res = await propertyAPI.toggleWishlist(property.id);
      setInWishlist(res.data.inWishlist);
      toast.success(res.data.message);
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Image gallery */}
      <div className="relative rounded-2xl overflow-hidden h-80 md:h-[450px] bg-gray-100 mb-6 group">
        {images.length > 0 ? (
          <>
            <img src={images[imgIdx]} alt={property.title} className="w-full h-full object-cover" />
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"><FiChevronLeft /></button>
                <button onClick={() => setImgIdx(i => (i + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"><FiChevronRight /></button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => <span key={i} onClick={() => setImgIdx(i)} className={`w-2 h-2 rounded-full cursor-pointer ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`} />)}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center"><span className="text-8xl">🏠</span></div>
        )}
        {property.is_featured && <span className="absolute top-4 left-4 bg-accent-500 text-white text-sm font-bold px-3 py-1 rounded-xl">Featured</span>}
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={handleWishlist} className="bg-white rounded-full w-10 h-10 flex items-center justify-center shadow hover:scale-110 transition-transform">
            <FiHeart className={inWishlist ? 'text-red-500 fill-red-500' : 'text-gray-500'} size={18} />
          </button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }} className="bg-white rounded-full w-10 h-10 flex items-center justify-center shadow hover:scale-110 transition-transform">
            <FiShare2 className="text-gray-500" size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="font-display text-3xl text-gray-900">{property.title}</h1>
                <div className="flex items-center gap-2 text-gray-500 mt-2">
                  <FiMapPin size={16} />
                  <span>{property.location}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary-700">₹{Number(property.price).toLocaleString('en-IN')}</p>
                <p className="text-sm text-gray-500">/{property.price_type?.replace('per_', '')}</p>
              </div>
            </div>
            {property.avg_rating > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <StarRating rating={property.avg_rating} size="lg" />
                <span className="text-sm text-gray-600">{parseFloat(property.avg_rating).toFixed(1)} ({property.total_reviews} reviews)</span>
              </div>
            )}
          </div>

          {/* Key info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🛏️', label: 'Bedrooms', val: property.bedrooms },
              { icon: '🚿', label: 'Bathrooms', val: property.bathrooms },
              { icon: '📐', label: 'Area', val: property.area_sqft ? `${property.area_sqft} sqft` : 'N/A' },
              { icon: '🏠', label: 'Type', val: property.property_type },
            ].map(({ icon, label, val }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl mb-1">{icon}</p>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-semibold text-gray-800 capitalize">{val}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {property.description && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-3 text-lg">About this property</h2>
              <p className="text-gray-600 leading-relaxed">{property.description}</p>
            </div>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-3 text-lg">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {amenities.map(a => (
                  <span key={a} className="bg-primary-50 text-primary-700 px-3 py-1.5 rounded-xl text-sm font-medium">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {property.reviews?.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-4 text-lg">Reviews</h2>
              <div className="space-y-4">
                {property.reviews.map(r => (
                  <div key={r.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-bold text-sm">{r.reviewer_name?.[0]}</div>
                        <span className="font-medium text-gray-800">{r.reviewer_name}</span>
                      </div>
                      <StarRating rating={r.rating} />
                    </div>
                    <p className="text-gray-600 text-sm">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Booking panel */}
        <div className="space-y-4">
          <div className="card p-6 sticky top-24">
            <h2 className="font-semibold text-gray-900 mb-4">Book this property</h2>
            {property.is_available ? (
              <>
                <BookingCalendar property={property} onBookingData={setBookingData} />
                <button
                  onClick={() => { if (!bookingData) { toast.error('Select dates first'); return; } setBookingModal(true); }}
                  className="btn-primary w-full mt-4"
                >
                  {isAuthenticated ? 'Request Booking' : 'Login to Book'}
                </button>
              </>
            ) : (
              <div className="text-center py-8 bg-red-50 rounded-xl">
                <p className="text-red-500 font-semibold">Not Available</p>
                <p className="text-sm text-gray-500 mt-1">This property is currently unavailable</p>
              </div>
            )}
          </div>

          {/* Owner card */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Listed by</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">{property.owner_name?.[0]}</div>
              <div>
                <p className="font-semibold text-gray-900">{property.owner_name}</p>
                <p className="text-xs text-gray-500">Property Owner</p>
              </div>
            </div>
            {isAuthenticated && (
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p className="flex items-center gap-2"><FiMail size={14} />{property.owner_email}</p>
                {property.owner_phone && <p className="flex items-center gap-2"><FiPhone size={14} />{property.owner_phone}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking confirm modal */}
      <Modal open={bookingModal} onClose={() => setBookingModal(false)} title="Confirm Booking Request">
        {bookingData && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Property</span><span className="font-medium">{property.title}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Check-in</span><span className="font-medium">{bookingData.checkIn}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Check-out</span><span className="font-medium">{bookingData.checkOut}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-medium">{bookingData.days} days</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2"><span className="font-semibold">Total Amount</span><span className="font-bold text-primary-700">₹{Number(bookingData.amount).toLocaleString('en-IN')}</span></div>
            </div>
            <p className="text-xs text-gray-500">Your booking request will be sent to the owner for approval. Payment can be made after confirmation.</p>
            <div className="flex gap-3">
              <button onClick={() => setBookingModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleBooking} disabled={bookingLoading} className="btn-primary flex-1">
                {bookingLoading ? 'Sending...' : 'Confirm Request'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

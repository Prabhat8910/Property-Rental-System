import { useState, useEffect } from 'react';
import { format, differenceInDays, isWithinInterval, parseISO } from 'date-fns';
import { bookingAPI } from '../../services/api';

export default function BookingCalendar({ property, onBookingData }) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [bookedRanges, setBookedRanges] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    bookingAPI.getAvailability(property.id)
      .then(res => setBookedRanges(res.data.data))
      .catch(() => {});
  }, [property.id]);

  const isDateBooked = (date) => {
    return bookedRanges.some(range => {
      try {
        return isWithinInterval(new Date(date), {
          start: parseISO(range.check_in),
          end: parseISO(range.check_out)
        });
      } catch {
        return false;
      }
    });
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  // 🔥 FIX: useEffect se booking data bhejna (MOST IMPORTANT)
  useEffect(() => {
    if (checkIn && checkOut) {
      const days = differenceInDays(new Date(checkOut), new Date(checkIn));

      if (days <= 0) {
        setError('Check-out must be after check-in');
        return;
      }

      let amount;
      if (property.price_type === 'per_month') amount = (property.price / 30) * days;
      else if (property.price_type === 'per_week') amount = (property.price / 7) * days;
      else amount = property.price * days;

      setError('');

      onBookingData({
        checkIn,
        checkOut,
        days,
        amount: amount.toFixed(2)
      });
    }
  }, [checkIn, checkOut]);

  const calcTotal = () => {
    if (!checkIn || !checkOut) return null;
    const days = differenceInDays(new Date(checkOut), new Date(checkIn));
    if (days <= 0) return null;

    let amount;
    if (property.price_type === 'per_month') amount = (property.price / 30) * days;
    else if (property.price_type === 'per_week') amount = (property.price / 7) * days;
    else amount = property.price * days;

    return { days, amount: amount.toFixed(2) };
  };

  const handleCheckIn = (val) => {
    setCheckIn(val);
    setCheckOut('');
    setError('');
  };

  const handleCheckOut = (val) => {
    if (isDateBooked(val) || (checkIn && isDateBooked(checkIn))) {
      setError('Selected dates overlap with an existing booking');
      return;
    }

    setCheckOut(val);
    setError('');
  };

  const total = calcTotal();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">CHECK-IN</label>
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={e => handleCheckIn(e.target.value)}
            className="input text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">CHECK-OUT</label>
          <input
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={e => handleCheckOut(e.target.value)}
            className="input text-sm"
            disabled={!checkIn}
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      {total && (
        <div className="bg-primary-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>₹{Number(property.price).toLocaleString('en-IN')} × {total.days} days</span>
            <span>₹{Number(total.amount).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 border-t border-primary-100 pt-2">
            <span>Total</span>
            <span className="text-primary-700">₹{Number(total.amount).toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}

      {bookedRanges.length > 0 && (
        <div className="text-xs text-gray-500">
          <p className="font-medium mb-1">⚠️ Unavailable periods:</p>
          {bookedRanges.map((r, i) => (
            <p key={i}>
              {format(parseISO(r.check_in), 'MMM d')} – {format(parseISO(r.check_out), 'MMM d, yyyy')}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
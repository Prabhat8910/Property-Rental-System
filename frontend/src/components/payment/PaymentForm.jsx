import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { paymentAPI } from '../../services/api';
import { FiCreditCard, FiLock } from 'react-icons/fi';

// NOTE: Replace with your Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';

export default function PaymentForm({ booking, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const handlePayment = async () => {
    if (!cardNum || !expiry || !cvv) { toast.error('Please fill in all card details'); return; }
    setLoading(true);
    try {
      // Create payment intent
      const intentRes = await paymentAPI.createIntent({ booking_id: booking.id });
      const { clientSecret } = intentRes.data.data;

      // Load Stripe
      const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
      if (!stripe) throw new Error('Stripe failed to load');

      // Confirm card payment (demo: using test card)
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: {
            // In real app, use Stripe Elements. This is simplified for demo.
            number: cardNum.replace(/\s/g, ''),
            exp_month: parseInt(expiry.split('/')[0]),
            exp_year: parseInt('20' + expiry.split('/')[1]),
            cvc: cvv,
          },
        },
      });

      if (error) throw new Error(error.message);

      // Confirm on backend
      await paymentAPI.confirm({ payment_intent_id: paymentIntent.id });
      toast.success('Payment successful! Booking confirmed.');
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCard = (val) => val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  const formatExpiry = (val) => { const d = val.replace(/\D/g, ''); return d.length >= 3 ? `${d.slice(0,2)}/${d.slice(2,4)}` : d; };

  return (
    <div className="space-y-4">
      <div className="bg-primary-50 rounded-xl p-4 flex justify-between items-center">
        <span className="text-gray-700 font-medium">Amount Due</span>
        <span className="text-2xl font-bold text-primary-700">
          ₹{Number(booking.total_amount).toLocaleString('en-IN')}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Card Number</label>
          <div className="relative">
            <input
              value={cardNum}
              onChange={e => setCardNum(formatCard(e.target.value))}
              placeholder="4242 4242 4242 4242"
              className="input pl-10"
              maxLength={19}
            />
            <FiCreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Expiry</label>
            <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" className="input" maxLength={5} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">CVV</label>
            <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="123" className="input" maxLength={4} type="password" />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1"><FiLock size={11} /> Payments secured by Stripe. Use card 4242 4242 4242 4242 for testing.</p>

      <button onClick={handlePayment} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
        {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Processing...</> : <>Pay ₹{Number(booking.total_amount).toLocaleString('en-IN')}</>}
      </button>
    </div>
  );
}

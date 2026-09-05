const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const paymentSchema = new mongoose.Schema(
  {
    uuid: { type: String, default: uuidv4, unique: true, index: true },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    payment_method: { type: String, enum: ['stripe', 'bank_transfer', 'cash'], default: 'stripe' },
    stripe_payment_intent_id: { type: String, default: null, index: true },
    stripe_charge_id: { type: String, default: null },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    payment_date: { type: Date, default: null },
    receipt_url: { type: String, default: null },
    notes: { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('Payment', paymentSchema);

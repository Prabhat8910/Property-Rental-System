const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const bookingSchema = new mongoose.Schema(
  {
    uuid: { type: String, default: uuidv4, unique: true, index: true },
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    check_in: { type: Date, required: true },
    check_out: { type: Date, required: true },
    total_days: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'], default: 'pending', index: true },
    cancellation_reason: { type: String, default: null },
    notes: { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        // Format check_in and check_out as YYYY-MM-DD strings for frontend consistency
        if (ret.check_in instanceof Date) ret.check_in = ret.check_in.toISOString().split('T')[0];
        if (ret.check_out instanceof Date) ret.check_out = ret.check_out.toISOString().split('T')[0];
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('Booking', bookingSchema);

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const reviewSchema = new mongoose.Schema(
  {
    uuid: { type: String, default: uuidv4, unique: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    is_approved: { type: Boolean, default: true },
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

reviewSchema.index({ user_id: 1, booking_id: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Review', reviewSchema);

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['booking', 'payment', 'maintenance', 'review', 'system'],
      default: 'system',
    },
    reference_id: { type: mongoose.Schema.Types.Mixed, default: null },
    is_read: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
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

module.exports = mongoose.model('Notification', notificationSchema);

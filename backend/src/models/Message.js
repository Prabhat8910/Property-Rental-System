const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    content: { type: String, required: true, trim: true },
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

module.exports = mongoose.model('Message', messageSchema);

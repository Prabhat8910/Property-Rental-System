const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
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

wishlistSchema.index({ user_id: 1, property_id: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);

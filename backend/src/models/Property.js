const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const propertySchema = new mongoose.Schema(
  {
    uuid: { type: String, default: uuidv4, unique: true, index: true },
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    state: { type: String, trim: true },
    country: { type: String, default: 'India' },
    zip_code: { type: String, trim: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    price: { type: Number, required: true },
    price_type: { type: String, enum: ['per_month', 'per_day', 'per_week'], default: 'per_month' },
    property_type: { type: String, enum: ['apartment', 'house', 'villa', 'studio', 'commercial'], default: 'apartment' },
    bedrooms: { type: Number, default: 1 },
    bathrooms: { type: Number, default: 1 },
    area_sqft: { type: Number, default: null },
    amenities: { type: [String], default: [] },
    images: { type: [String], default: [] },
    is_available: { type: Boolean, default: true },
    is_featured: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
    avg_rating: { type: Number, default: 0 },
    total_reviews: { type: Number, default: 0 },
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

module.exports = mongoose.model('Property', propertySchema);

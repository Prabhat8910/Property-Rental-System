const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const maintenanceRequestSchema = new mongoose.Schema(
  {
    uuid: { type: String, default: uuidv4, unique: true, index: true },
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'other'],
      default: 'other',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    images: { type: [String], default: [] },
    owner_notes: { type: String, default: null },
    resolved_at: { type: Date, default: null },
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

module.exports = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Property = require('../models/Property');
const User = require('../models/User');
const { createNotification } = require('../utils/notification');
const { findPropertyByIdOrUuid } = require('./propertyController');

const findMaintenanceByIdOrUuid = async (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const req = await MaintenanceRequest.findById(id);
    if (req) return req;
  }
  return await MaintenanceRequest.findOne({ uuid: id });
};

// POST /api/maintenance
const createRequest = async (req, res, next) => {
  try {
    const { property_id, title, description, category, priority } = req.body;
    const images = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : [];

    const property = await findPropertyByIdOrUuid(property_id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const request = await MaintenanceRequest.create({
      uuid: uuidv4(),
      property_id: property._id,
      tenant_id: req.user.id || req.user._id,
      title,
      description,
      category: category || 'other',
      priority: priority || 'medium',
      images,
    });

    await createNotification(property.owner_id, 'New Maintenance Request', `New ${priority || 'medium'} priority request: "${title}"`, 'maintenance', request._id);

    res.status(201).json({ success: true, message: 'Maintenance request submitted', data: request });
  } catch (error) { next(error); }
};

// GET /api/maintenance
const getRequests = async (req, res, next) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const { role } = req.user;
    const userId = req.user.id || req.user._id;

    const filter = {};

    if (role === 'tenant') {
      filter.tenant_id = userId;
    } else if (role === 'owner') {
      const ownerProperties = await Property.find({ owner_id: userId }).select('_id');
      const ownerPropertyIds = ownerProperties.map((p) => p._id);
      filter.property_id = { $in: ownerPropertyIds };
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const priorityWeight = { urgent: 1, high: 2, medium: 3, low: 4 };

    const requests = await MaintenanceRequest.find(filter)
      .populate('property_id', 'title location')
      .populate('tenant_id', 'name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Sort by priority weight
    requests.sort((a, b) => (priorityWeight[a.priority] || 99) - (priorityWeight[b.priority] || 99));

    const total = await MaintenanceRequest.countDocuments(filter);

    const formattedRequests = requests.map((r) => {
      const obj = r.toJSON();
      if (r.property_id && typeof r.property_id === 'object') {
        obj.property_title = r.property_id.title;
        obj.location = r.property_id.location;
      }
      if (r.tenant_id && typeof r.tenant_id === 'object') {
        obj.tenant_name = r.tenant_id.name;
        obj.tenant_email = r.tenant_id.email;
      }
      return obj;
    });

    res.json({
      success: true,
      data: formattedRequests,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) { next(error); }
};

// PUT /api/maintenance/:id
const updateRequest = async (req, res, next) => {
  try {
    const { status, owner_notes } = req.body;
    const request = await findMaintenanceByIdOrUuid(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const property = await Property.findById(request.property_id);
    const userIdStr = (req.user.id || req.user._id).toString();

    if (req.user.role === 'owner' && property && property.owner_id.toString() !== userIdStr) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (status) {
      request.status = status;
      if (status === 'resolved') request.resolved_at = new Date();
    }
    if (owner_notes !== undefined) request.owner_notes = owner_notes;

    await request.save();

    await createNotification(request.tenant_id, 'Maintenance Update', `Your maintenance request "${request.title}" status changed to ${status}`, 'maintenance', request._id);

    res.json({ success: true, message: 'Request updated' });
  } catch (error) { next(error); }
};

module.exports = { createRequest, getRequests, updateRequest };

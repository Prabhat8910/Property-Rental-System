const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Property = require('../models/Property');
const Review = require('../models/Review');
const Wishlist = require('../models/Wishlist');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');

const findPropertyByIdOrUuid = async (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const prop = await Property.findById(id);
    if (prop) return prop;
  }
  return await Property.findOne({ uuid: id });
};

// GET /api/properties - with filters
const getProperties = async (req, res, next) => {
  try {
    const { city, min_price, max_price, property_type, bedrooms, available, featured, page = 1, limit = 12, search } = req.query;
    const skip = (page - 1) * limit;

    const filter = { status: 'active' };

    if (city) filter.city = { $regex: city, $options: 'i' };
    if (min_price || max_price) {
      filter.price = {};
      if (min_price) filter.price.$gte = Number(min_price);
      if (max_price) filter.price.$lte = Number(max_price);
    }
    if (property_type) filter.property_type = property_type;
    if (bedrooms) filter.bedrooms = { $gte: Number(bedrooms) };
    if (available === 'true') filter.is_available = true;
    if (featured === 'true') filter.is_featured = true;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const properties = await Property.find(filter)
      .populate('owner_id', 'name email phone avatar')
      .sort({ is_featured: -1, created_at: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Property.countDocuments(filter);

    const formattedProperties = properties.map((p) => {
      const obj = p.toJSON();
      if (p.owner_id && typeof p.owner_id === 'object') {
        obj.owner_name = p.owner_id.name;
        obj.owner_email = p.owner_id.email;
        obj.owner_phone = p.owner_id.phone;
        obj.owner_avatar = p.owner_id.avatar;
        obj.owner_id = p.owner_id._id.toString();
      }
      return obj;
    });

    res.json({
      success: true,
      data: formattedProperties,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) { next(error); }
};

// GET /api/properties/:id
const getProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await findPropertyByIdOrUuid(id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    await property.populate('owner_id', 'name email phone avatar');

    const propertyObj = property.toJSON();
    if (property.owner_id && typeof property.owner_id === 'object') {
      propertyObj.owner_name = property.owner_id.name;
      propertyObj.owner_email = property.owner_id.email;
      propertyObj.owner_phone = property.owner_id.phone;
      propertyObj.owner_avatar = property.owner_id.avatar;
      propertyObj.owner_id = property.owner_id._id.toString();
    }

    // Get reviews
    const reviews = await Review.find({ property_id: property._id, is_approved: true })
      .populate('user_id', 'name avatar')
      .sort({ created_at: -1 })
      .limit(10);

    const formattedReviews = reviews.map((r) => {
      const obj = r.toJSON();
      if (r.user_id && typeof r.user_id === 'object') {
        obj.reviewer_name = r.user_id.name;
        obj.reviewer_avatar = r.user_id.avatar;
        obj.user_id = r.user_id._id.toString();
      }
      return obj;
    });

    // Check wishlist if authenticated
    let inWishlist = false;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const wl = await Wishlist.findOne({ user_id: decoded.userId, property_id: property._id });
        inWishlist = !!wl;
      } catch {}
    }

    res.json({ success: true, data: { ...propertyObj, reviews: formattedReviews, inWishlist } });
  } catch (error) { next(error); }
};

// POST /api/properties
const createProperty = async (req, res, next) => {
  try {
    const { title, description, location, city, state, country, zip_code, price, price_type, property_type, bedrooms, bathrooms, area_sqft, amenities, latitude, longitude } = req.body;
    const images = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : [];

    let parsedAmenities = [];
    if (amenities) {
      parsedAmenities = typeof amenities === 'string' ? JSON.parse(amenities) : amenities;
    }

    const newProperty = await Property.create({
      uuid: uuidv4(),
      owner_id: req.user.id || req.user._id,
      title,
      description,
      location,
      city,
      state,
      country: country || 'India',
      zip_code,
      price: Number(price),
      price_type: price_type || 'per_month',
      property_type: property_type || 'apartment',
      bedrooms: bedrooms ? Number(bedrooms) : 1,
      bathrooms: bathrooms ? Number(bathrooms) : 1,
      area_sqft: area_sqft ? Number(area_sqft) : null,
      amenities: parsedAmenities,
      images,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
    });

    res.status(201).json({ success: true, message: 'Property created', data: newProperty });
  } catch (error) { next(error); }
};

// PUT /api/properties/:id
const updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await findPropertyByIdOrUuid(id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const ownerIdStr = property.owner_id.toString();
    const userIdStr = (req.user.id || req.user._id).toString();

    if (ownerIdStr !== userIdStr && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const fields = ['title', 'description', 'location', 'city', 'state', 'price', 'property_type', 'bedrooms', 'bathrooms', 'area_sqft', 'is_available', 'status'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) property[f] = req.body[f];
    });

    if (req.body.amenities) {
      property.amenities = typeof req.body.amenities === 'string' ? JSON.parse(req.body.amenities) : req.body.amenities;
    }
    if (req.files?.length) {
      property.images = req.files.map((f) => `/uploads/${f.filename}`);
    }

    await property.save();
    res.json({ success: true, message: 'Property updated', data: property });
  } catch (error) { next(error); }
};

// DELETE /api/properties/:id
const deleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await findPropertyByIdOrUuid(id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const ownerIdStr = property.owner_id.toString();
    const userIdStr = (req.user.id || req.user._id).toString();

    if (ownerIdStr !== userIdStr && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Property.findByIdAndDelete(property._id);
    res.json({ success: true, message: 'Property deleted' });
  } catch (error) { next(error); }
};

// GET /api/properties/owner/my-properties
const getMyProperties = async (req, res, next) => {
  try {
    const ownerId = req.user.id || req.user._id;
    const properties = await Property.find({ owner_id: ownerId }).sort({ created_at: -1 });

    const propertyIds = properties.map((p) => p._id);
    const bookings = await Booking.find({ property_id: { $in: propertyIds } });
    const confirmedBookingIds = bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').map((b) => b._id);
    const payments = await Payment.find({ booking_id: { $in: confirmedBookingIds }, status: 'completed' });

    const formattedProperties = properties.map((p) => {
      const obj = p.toJSON();
      const pBookings = bookings.filter((b) => b.property_id.toString() === p._id.toString());
      obj.total_bookings = pBookings.filter((b) => ['confirmed', 'completed'].includes(b.status)).length;
      obj.active_bookings = pBookings.filter((b) => b.status === 'confirmed').length;

      const pBookingIds = pBookings.map((b) => b._id.toString());
      const pPayments = payments.filter((pay) => pBookingIds.includes(pay.booking_id.toString()));
      obj.total_revenue = pPayments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
      return obj;
    });

    res.json({ success: true, data: formattedProperties });
  } catch (error) { next(error); }
};

// POST /api/properties/:id/wishlist
const toggleWishlist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await findPropertyByIdOrUuid(id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const userId = req.user.id || req.user._id;
    const propertyId = property._id;

    const existing = await Wishlist.findOne({ user_id: userId, property_id: propertyId });

    if (existing) {
      await Wishlist.findByIdAndDelete(existing._id);
      return res.json({ success: true, message: 'Removed from wishlist', inWishlist: false });
    } else {
      await Wishlist.create({ user_id: userId, property_id: propertyId });
      return res.json({ success: true, message: 'Added to wishlist', inWishlist: true });
    }
  } catch (error) { next(error); }
};

module.exports = { getProperties, getProperty, createProperty, updateProperty, deleteProperty, getMyProperties, toggleWishlist, findPropertyByIdOrUuid };

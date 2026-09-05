const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { createNotification } = require('../utils/notification');

const findBookingByIdOrUuid = async (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const booking = await Booking.findById(id);
    if (booking) return booking;
  }
  return await Booking.findOne({ uuid: id });
};

// POST /api/bookings
const createBooking = async (req, res, next) => {
  try {
    const { property_id, check_in, check_out, notes } = req.body;

    let property;
    if (mongoose.Types.ObjectId.isValid(property_id)) {
      property = await Property.findById(property_id);
    }
    if (!property) {
      property = await Property.findOne({ uuid: property_id });
    }
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    if (!property.is_available) return res.status(400).json({ success: false, message: 'Property is not available' });

    const tenantIdStr = (req.user.id || req.user._id).toString();
    const ownerIdStr = property.owner_id.toString();
    if (ownerIdStr === tenantIdStr) return res.status(400).json({ success: false, message: 'Owners cannot book their own property' });

    // Validate dates
    const checkIn = new Date(check_in);
    const checkOut = new Date(check_out);
    if (checkIn >= checkOut) return res.status(400).json({ success: false, message: 'Check-out must be after check-in' });
    if (checkIn < new Date()) return res.status(400).json({ success: false, message: 'Check-in cannot be in the past' });

    // Check for overlapping bookings (pending or confirmed)
    const conflicts = await Booking.find({
      property_id: property._id,
      status: { $in: ['pending', 'confirmed'] },
      check_in: { $lt: checkOut },
      check_out: { $gt: checkIn },
    });

    if (conflicts.length > 0) {
      return res.status(409).json({ success: false, message: 'Property already booked for selected dates' });
    }

    // Calculate total
    const totalDays = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    let totalAmount;
    if (property.price_type === 'per_month') {
      totalAmount = (property.price / 30) * totalDays;
    } else if (property.price_type === 'per_week') {
      totalAmount = (property.price / 7) * totalDays;
    } else {
      totalAmount = property.price * totalDays;
    }

    const booking = await Booking.create({
      uuid: uuidv4(),
      tenant_id: req.user.id || req.user._id,
      property_id: property._id,
      check_in: checkIn,
      check_out: checkOut,
      total_days: totalDays,
      total_amount: Number(totalAmount.toFixed(2)),
      notes,
    });

    // Notify owner
    await createNotification(property.owner_id, 'New Booking Request', `${req.user.name} has requested to book "${property.title}"`, 'booking', booking._id);

    res.status(201).json({ success: true, message: 'Booking created', data: booking });
  } catch (error) { next(error); }
};

// GET /api/bookings
const getBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const { role } = req.user;
    const userId = req.user.id || req.user._id;

    const filter = {};

    if (role === 'tenant') {
      filter.tenant_id = userId;
    } else if (role === 'owner') {
      const ownerProperties = await Property.find({ owner_id: userId }).select('_id');
      const propertyIds = ownerProperties.map((p) => p._id);
      filter.property_id = { $in: propertyIds };
    }

    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate('property_id', 'title location images owner_id')
      .populate('tenant_id', 'name email phone')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    const bookingIds = bookings.map((b) => b._id);
    const payments = await Payment.find({ booking_id: { $in: bookingIds }, status: 'completed' });

    const formattedBookings = bookings.map((b) => {
      const obj = b.toJSON();
      if (b.property_id && typeof b.property_id === 'object') {
        obj.property_title = b.property_id.title;
        obj.property_location = b.property_id.location;
        obj.property_images = b.property_id.images;
      }
      if (b.tenant_id && typeof b.tenant_id === 'object') {
        obj.tenant_name = b.tenant_id.name;
        obj.tenant_email = b.tenant_id.email;
        obj.tenant_phone = b.tenant_id.phone;
      }
      const pay = payments.find((p) => p.booking_id.toString() === b._id.toString());
      obj.payment_status = pay ? pay.status : null;
      obj.stripe_payment_intent_id = pay ? pay.stripe_payment_intent_id : null;
      return obj;
    });

    res.json({
      success: true,
      data: formattedBookings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) { next(error); }
};

// GET /api/bookings/:id
const getBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await findBookingByIdOrUuid(id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    await booking.populate([
      { path: 'property_id', select: 'title location images price owner_id', populate: { path: 'owner_id', select: 'name email' } },
      { path: 'tenant_id', select: 'name email phone' },
    ]);

    const obj = booking.toJSON();
    if (booking.property_id && typeof booking.property_id === 'object') {
      obj.property_title = booking.property_id.title;
      obj.location = booking.property_id.location;
      obj.images = booking.property_id.images;
      obj.price = booking.property_id.price;
      if (booking.property_id.owner_id && typeof booking.property_id.owner_id === 'object') {
        obj.owner_name = booking.property_id.owner_id.name;
        obj.owner_email = booking.property_id.owner_id.email;
        obj.owner_id = booking.property_id.owner_id._id.toString();
      }
    }
    if (booking.tenant_id && typeof booking.tenant_id === 'object') {
      obj.tenant_name = booking.tenant_id.name;
      obj.tenant_email = booking.tenant_id.email;
      obj.tenant_phone = booking.tenant_id.phone;
    }

    const userIdStr = (req.user.id || req.user._id).toString();
    if (req.user.role === 'tenant' && obj.tenant_id.toString() !== userIdStr) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (req.user.role === 'owner' && obj.owner_id && obj.owner_id.toString() !== userIdStr) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: obj });
  } catch (error) { next(error); }
};

// PUT /api/bookings/:id/status
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, cancellation_reason } = req.body;
    const booking = await findBookingByIdOrUuid(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const property = await Property.findById(booking.property_id);
    const userIdStr = (req.user.id || req.user._id).toString();
    const { role } = req.user;

    if (role === 'owner' && property.owner_id.toString() !== userIdStr && !['confirmed', 'rejected'].includes(status)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (role === 'tenant' && booking.tenant_id.toString() !== userIdStr && status !== 'cancelled') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    booking.status = status;
    if (cancellation_reason !== undefined) booking.cancellation_reason = cancellation_reason;
    await booking.save();

    // Notify user
    const notifyUserId = role === 'owner' ? booking.tenant_id : property.owner_id;
    await createNotification(notifyUserId, 'Booking Status Updated', `Your booking for "${property ? property.title : 'property'}" is now ${status}`, 'booking', booking._id);

    res.json({ success: true, message: 'Booking status updated' });
  } catch (error) { next(error); }
};

// GET /api/bookings/availability/:propertyId
const getAvailability = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    let propObjId = propertyId;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      const prop = await Property.findOne({ uuid: propertyId });
      if (prop) propObjId = prop._id;
    }

    const bookedDates = await Booking.find({
      property_id: propObjId,
      status: { $in: ['pending', 'confirmed'] },
    }).select('check_in check_out');

    const formatted = bookedDates.map((b) => ({
      check_in: b.check_in.toISOString().split('T')[0],
      check_out: b.check_out.toISOString().split('T')[0],
    }));

    res.json({ success: true, data: formatted });
  } catch (error) { next(error); }
};

module.exports = { createBooking, getBookings, getBooking, updateBookingStatus, getAvailability, findBookingByIdOrUuid };

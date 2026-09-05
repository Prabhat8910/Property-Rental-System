const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Review = require('../models/Review');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { findPropertyByIdOrUuid } = require('./propertyController');
const { findBookingByIdOrUuid } = require('./bookingController');

// POST /api/reviews
const createReview = async (req, res, next) => {
  try {
    const { property_id, booking_id, rating, comment } = req.body;

    const property = await findPropertyByIdOrUuid(property_id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    const propId = property._id;
    const userId = req.user.id || req.user._id;

    let validBookingId = null;
    if (booking_id) {
      const booking = await findBookingByIdOrUuid(booking_id);
      if (!booking || booking.tenant_id.toString() !== userId.toString() || booking.property_id.toString() !== propId.toString()) {
        return res.status(400).json({ success: false, message: 'Invalid booking' });
      }
      if (!['completed', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({ success: false, message: 'Can only review confirmed/completed bookings' });
      }
      validBookingId = booking._id;
    }

    const review = await Review.create({
      uuid: uuidv4(),
      user_id: userId,
      property_id: propId,
      booking_id: validBookingId,
      rating: Number(rating),
      comment,
    });

    // Update property avg rating
    const allReviews = await Review.find({ property_id: propId, is_approved: true });
    const totalReviews = allReviews.length;
    const avgRating = totalReviews > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;

    await Property.findByIdAndUpdate(propId, {
      avg_rating: Number(avgRating.toFixed(2)),
      total_reviews: totalReviews,
    });

    await review.populate('user_id', 'name avatar');
    const reviewObj = review.toJSON();
    if (review.user_id && typeof review.user_id === 'object') {
      reviewObj.reviewer_name = review.user_id.name;
    }

    res.status(201).json({ success: true, message: 'Review submitted', data: reviewObj });
  } catch (error) { next(error); }
};

// GET /api/reviews/property/:propertyId
const getPropertyReviews = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const property = await findPropertyByIdOrUuid(propertyId);
    const propId = property ? property._id : propertyId;

    const reviews = await Review.find({ property_id: propId, is_approved: true })
      .populate('user_id', 'name avatar')
      .sort({ created_at: -1 });

    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;

    const formattedReviews = reviews.map((r) => {
      const obj = r.toJSON();
      if (r.user_id && typeof r.user_id === 'object') {
        obj.reviewer_name = r.user_id.name;
        obj.reviewer_avatar = r.user_id.avatar;
      }
      return obj;
    });

    res.json({ success: true, data: formattedReviews, stats: { avg: Number(avg.toFixed(2)), total } });
  } catch (error) { next(error); }
};

module.exports = { createReview, getPropertyReviews };

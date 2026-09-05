const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const Wishlist = require('../models/Wishlist');
const Message = require('../models/Message');

const migrate = async () => {
  try {
    console.log('🚀 Connecting to MongoDB for schema initialization...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/property_rental');

    console.log('🧹 Clearing existing collections...');
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].drop().catch(() => {});
    }

    console.log('🏗️ Building Mongoose Indexes...');
    await User.createIndexes();
    await Property.createIndexes();
    await Booking.createIndexes();
    await Payment.createIndexes();
    await MaintenanceRequest.createIndexes();
    await Review.createIndexes();
    await Notification.createIndexes();
    await Wishlist.createIndexes();
    await Message.createIndexes();

    console.log('✅ All MongoDB initialization & migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();

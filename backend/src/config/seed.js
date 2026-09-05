const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const MaintenanceRequest = require('../models/MaintenanceRequest');

const seed = async () => {
  try {
    console.log('🌱 Connecting to MongoDB for seeding...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/property_rental');

    console.log('🧹 Cleaning existing data...');
    await User.deleteMany({});
    await Property.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    await Review.deleteMany({});
    await MaintenanceRequest.deleteMany({});

    const hashedPassword = await bcrypt.hash('Password123!', 12);

    // Seed Users
    const usersData = [
      { uuid: uuidv4(), name: 'Super Admin', email: 'admin@rental.com', password: hashedPassword, role: 'admin', phone: '+91-9000000001', is_verified: true },
      { uuid: uuidv4(), name: 'Rajesh Kumar', email: 'owner1@rental.com', password: hashedPassword, role: 'owner', phone: '+91-9000000002', is_verified: true },
      { uuid: uuidv4(), name: 'Priya Sharma', email: 'owner2@rental.com', password: hashedPassword, role: 'owner', phone: '+91-9000000003', is_verified: true },
      { uuid: uuidv4(), name: 'Amit Singh', email: 'tenant1@rental.com', password: hashedPassword, role: 'tenant', phone: '+91-9000000004', is_verified: true },
      { uuid: uuidv4(), name: 'Neha Patel', email: 'tenant2@rental.com', password: hashedPassword, role: 'tenant', phone: '+91-9000000005', is_verified: true },
    ];

    const users = await User.insertMany(usersData);
    const owner1 = users.find((u) => u.email === 'owner1@rental.com');
    const owner2 = users.find((u) => u.email === 'owner2@rental.com');
    const tenant1 = users.find((u) => u.email === 'tenant1@rental.com');
    const tenant2 = users.find((u) => u.email === 'tenant2@rental.com');

    // Seed Properties
    const propertiesData = [
      {
        uuid: uuidv4(),
        owner_id: owner1._id,
        title: '2BHK Modern Apartment in Bandra',
        description: 'Spacious 2BHK apartment with sea view, fully furnished with modern amenities.',
        location: 'Bandra West, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        price: 45000,
        property_type: 'apartment',
        bedrooms: 2,
        bathrooms: 2,
        area_sqft: 950,
        amenities: ['WiFi', 'Parking', 'Gym', 'Swimming Pool', 'Security'],
        images: ['/uploads/sample1.jpg'],
        is_featured: true,
      },
      {
        uuid: uuidv4(),
        owner_id: owner1._id,
        title: 'Luxury Villa in Koregaon Park',
        description: '4BHK luxury villa with private garden and pool, ideal for families.',
        location: 'Koregaon Park, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        price: 120000,
        property_type: 'villa',
        bedrooms: 4,
        bathrooms: 3,
        area_sqft: 3200,
        amenities: ['WiFi', 'Private Pool', 'Garden', 'Parking', 'Security', 'Gym'],
        images: ['/uploads/sample2.jpg'],
        is_featured: true,
      },
      {
        uuid: uuidv4(),
        owner_id: owner2._id,
        title: 'Studio Apartment in Indiranagar',
        description: 'Cozy studio apartment perfect for working professionals.',
        location: 'Indiranagar, Bengaluru',
        city: 'Bengaluru',
        state: 'Karnataka',
        price: 18000,
        property_type: 'studio',
        bedrooms: 1,
        bathrooms: 1,
        area_sqft: 450,
        amenities: ['WiFi', 'AC', 'Power Backup', 'Security'],
        images: ['/uploads/sample3.jpg'],
        is_featured: false,
      },
      {
        uuid: uuidv4(),
        owner_id: owner2._id,
        title: '3BHK House in Sector 62 Noida',
        description: 'Spacious independent house with garden and parking.',
        location: 'Sector 62, Noida',
        city: 'Noida',
        state: 'Uttar Pradesh',
        price: 35000,
        property_type: 'house',
        bedrooms: 3,
        bathrooms: 2,
        area_sqft: 1800,
        amenities: ['WiFi', 'Parking', 'Garden', 'Security'],
        images: ['/uploads/sample4.jpg'],
        is_featured: false,
      },
    ];

    const properties = await Property.insertMany(propertiesData);

    // Seed Bookings
    const bookingsData = [
      {
        uuid: uuidv4(),
        tenant_id: tenant1._id,
        property_id: properties[0]._id,
        check_in: new Date('2025-02-01'),
        check_out: new Date('2025-04-30'),
        total_days: 89,
        total_amount: 135000,
        status: 'completed',
      },
      {
        uuid: uuidv4(),
        tenant_id: tenant2._id,
        property_id: properties[2]._id,
        check_in: new Date('2025-03-01'),
        check_out: new Date('2025-08-31'),
        total_days: 184,
        total_amount: 108000,
        status: 'confirmed',
      },
      {
        uuid: uuidv4(),
        tenant_id: tenant1._id,
        property_id: properties[1]._id,
        check_in: new Date('2025-05-15'),
        check_out: new Date('2025-08-15'),
        total_days: 92,
        total_amount: 360000,
        status: 'confirmed',
      },
    ];

    const bookings = await Booking.insertMany(bookingsData);

    // Seed Payments
    const paymentsData = bookings.map((b) => ({
      uuid: uuidv4(),
      booking_id: b._id,
      tenant_id: b.tenant_id,
      amount: b.total_amount,
      status: 'completed',
      payment_date: new Date(),
    }));

    await Payment.insertMany(paymentsData);

    // Seed Reviews
    const reviewsData = [
      {
        uuid: uuidv4(),
        user_id: tenant1._id,
        property_id: properties[0]._id,
        rating: 5,
        comment: 'Amazing apartment! Great location and very clean.',
      },
      {
        uuid: uuidv4(),
        user_id: tenant2._id,
        property_id: properties[2]._id,
        rating: 4,
        comment: 'Good studio, good value for money.',
      },
    ];

    await Review.insertMany(reviewsData);

    await Property.findByIdAndUpdate(properties[0]._id, { avg_rating: 5.0, total_reviews: 1 });
    await Property.findByIdAndUpdate(properties[2]._id, { avg_rating: 4.0, total_reviews: 1 });

    // Seed Maintenance Request
    await MaintenanceRequest.create({
      uuid: uuidv4(),
      property_id: properties[0]._id,
      tenant_id: tenant1._id,
      title: 'Leaking faucet in bathroom',
      description: 'The bathroom faucet has been leaking for 2 days.',
      category: 'plumbing',
      priority: 'medium',
      status: 'open',
    });

    console.log('✅ MongoDB Database seeded successfully!');
    console.log('\n🔐 Test Credentials:');
    console.log('  Admin:  admin@rental.com / Password123!');
    console.log('  Owner:  owner1@rental.com / Password123!');
    console.log('  Tenant: tenant1@rental.com / Password123!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();

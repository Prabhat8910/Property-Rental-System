const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./database');

const seed = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('🌱 Seeding database...');

    const hashedPassword = await bcrypt.hash('Password123!', 12);

    // Seed Users
    const users = [
      { uuid: uuidv4(), name: 'Super Admin', email: 'admin@rental.com', password: hashedPassword, role: 'admin', phone: '+91-9000000001' },
      { uuid: uuidv4(), name: 'Rajesh Kumar', email: 'owner1@rental.com', password: hashedPassword, role: 'owner', phone: '+91-9000000002' },
      { uuid: uuidv4(), name: 'Priya Sharma', email: 'owner2@rental.com', password: hashedPassword, role: 'owner', phone: '+91-9000000003' },
      { uuid: uuidv4(), name: 'Amit Singh', email: 'tenant1@rental.com', password: hashedPassword, role: 'tenant', phone: '+91-9000000004' },
      { uuid: uuidv4(), name: 'Neha Patel', email: 'tenant2@rental.com', password: hashedPassword, role: 'tenant', phone: '+91-9000000005' },
    ];

    const userIds = [];
    for (const user of users) {
      const [result] = await connection.query(
        `INSERT IGNORE INTO users (uuid, name, email, password, role, phone, is_verified) VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [user.uuid, user.name, user.email, user.password, user.role, user.phone]
      );
      if (result.insertId) userIds.push(result.insertId);
    }

    // Get actual user IDs
    const [dbUsers] = await connection.query(`SELECT id, role FROM users ORDER BY id`);
    const ownerIds = dbUsers.filter(u => u.role === 'owner').map(u => u.id);
    const tenantIds = dbUsers.filter(u => u.role === 'tenant').map(u => u.id);

    // Seed Properties
    const properties = [
      {
        uuid: uuidv4(), owner_id: ownerIds[0],
        title: '2BHK Modern Apartment in Bandra', description: 'Spacious 2BHK apartment with sea view, fully furnished with modern amenities.',
        location: 'Bandra West, Mumbai', city: 'Mumbai', state: 'Maharashtra',
        price: 45000, property_type: 'apartment', bedrooms: 2, bathrooms: 2, area_sqft: 950,
        amenities: JSON.stringify(['WiFi', 'Parking', 'Gym', 'Swimming Pool', 'Security']),
        images: JSON.stringify(['/uploads/sample1.jpg']), is_featured: true
      },
      {
        uuid: uuidv4(), owner_id: ownerIds[0],
        title: 'Luxury Villa in Koregaon Park', description: '4BHK luxury villa with private garden and pool, ideal for families.',
        location: 'Koregaon Park, Pune', city: 'Pune', state: 'Maharashtra',
        price: 120000, property_type: 'villa', bedrooms: 4, bathrooms: 3, area_sqft: 3200,
        amenities: JSON.stringify(['WiFi', 'Private Pool', 'Garden', 'Parking', 'Security', 'Gym']),
        images: JSON.stringify(['/uploads/sample2.jpg']), is_featured: true
      },
      {
        uuid: uuidv4(), owner_id: ownerIds[1],
        title: 'Studio Apartment in Indiranagar', description: 'Cozy studio apartment perfect for working professionals.',
        location: 'Indiranagar, Bengaluru', city: 'Bengaluru', state: 'Karnataka',
        price: 18000, property_type: 'studio', bedrooms: 1, bathrooms: 1, area_sqft: 450,
        amenities: JSON.stringify(['WiFi', 'AC', 'Power Backup', 'Security']),
        images: JSON.stringify(['/uploads/sample3.jpg']), is_featured: false
      },
      {
        uuid: uuidv4(), owner_id: ownerIds[1],
        title: '3BHK House in Sector 62 Noida', description: 'Spacious independent house with garden and parking.',
        location: 'Sector 62, Noida', city: 'Noida', state: 'Uttar Pradesh',
        price: 35000, property_type: 'house', bedrooms: 3, bathrooms: 2, area_sqft: 1800,
        amenities: JSON.stringify(['WiFi', 'Parking', 'Garden', 'Security']),
        images: JSON.stringify(['/uploads/sample4.jpg']), is_featured: false
      },
    ];

    const propertyIds = [];
    for (const property of properties) {
      const [result] = await connection.query(
        `INSERT IGNORE INTO properties (uuid, owner_id, title, description, location, city, state, price, property_type, bedrooms, bathrooms, area_sqft, amenities, images, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [property.uuid, property.owner_id, property.title, property.description, property.location,
         property.city, property.state, property.price, property.property_type, property.bedrooms,
         property.bathrooms, property.area_sqft, property.amenities, property.images, property.is_featured]
      );
      if (result.insertId) propertyIds.push(result.insertId);
    }

    // Seed Bookings
    const [dbProperties] = await connection.query(`SELECT id FROM properties ORDER BY id LIMIT 4`);
    if (dbProperties.length > 0 && tenantIds.length > 0) {
      const bookings = [
        { uuid: uuidv4(), tenant_id: tenantIds[0], property_id: dbProperties[0].id, check_in: '2025-02-01', check_out: '2025-04-30', total_days: 89, total_amount: 135000, status: 'completed' },
        { uuid: uuidv4(), tenant_id: tenantIds[1], property_id: dbProperties[2].id, check_in: '2025-03-01', check_out: '2025-08-31', total_days: 184, total_amount: 108000, status: 'confirmed' },
        { uuid: uuidv4(), tenant_id: tenantIds[0], property_id: dbProperties[1].id, check_in: '2025-05-15', check_out: '2025-08-15', total_days: 92, total_amount: 360000, status: 'confirmed' },
      ];

      const bookingIds = [];
      for (const booking of bookings) {
        const [result] = await connection.query(
          `INSERT IGNORE INTO bookings (uuid, tenant_id, property_id, check_in, check_out, total_days, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [booking.uuid, booking.tenant_id, booking.property_id, booking.check_in, booking.check_out, booking.total_days, booking.total_amount, booking.status]
        );
        if (result.insertId) bookingIds.push({ id: result.insertId, tenant_id: booking.tenant_id, amount: booking.total_amount });
      }

      // Seed Payments
      const [dbBookings] = await connection.query(`SELECT id, tenant_id, total_amount FROM bookings ORDER BY id LIMIT 3`);
      for (const booking of dbBookings) {
        await connection.query(
          `INSERT IGNORE INTO payments (uuid, booking_id, tenant_id, amount, status, payment_date) VALUES (?, ?, ?, ?, 'completed', NOW())`,
          [uuidv4(), booking.id, booking.tenant_id, booking.total_amount]
        );
      }

      // Seed Reviews
      if (dbProperties.length > 0 && tenantIds.length > 0) {
        const reviews = [
          { uuid: uuidv4(), user_id: tenantIds[0], property_id: dbProperties[0].id, rating: 5, comment: 'Amazing apartment! Great location and very clean.' },
          { uuid: uuidv4(), user_id: tenantIds[1], property_id: dbProperties[2].id, rating: 4, comment: 'Good studio, good value for money.' },
        ];
        for (const review of reviews) {
          await connection.query(
            `INSERT IGNORE INTO reviews (uuid, user_id, property_id, rating, comment) VALUES (?, ?, ?, ?, ?)`,
            [review.uuid, review.user_id, review.property_id, review.rating, review.comment]
          );
        }
        await connection.query(`UPDATE properties SET avg_rating = 5.0, total_reviews = 1 WHERE id = ?`, [dbProperties[0].id]);
        await connection.query(`UPDATE properties SET avg_rating = 4.0, total_reviews = 1 WHERE id = ?`, [dbProperties[2].id]);
      }

      // Seed Maintenance Requests
      if (tenantIds.length > 0 && dbProperties.length > 0) {
        await connection.query(
          `INSERT IGNORE INTO maintenance_requests (uuid, property_id, tenant_id, title, description, category, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), dbProperties[0].id, tenantIds[0], 'Leaking faucet in bathroom', 'The bathroom faucet has been leaking for 2 days.', 'plumbing', 'medium', 'open']
        );
      }
    }

    console.log('✅ Database seeded successfully!');
    console.log('\n🔐 Test Credentials:');
    console.log('  Admin:  admin@rental.com / Password123!');
    console.log('  Owner:  owner1@rental.com / Password123!');
    console.log('  Tenant: tenant1@rental.com / Password123!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    connection.release();
  }
};

seed();

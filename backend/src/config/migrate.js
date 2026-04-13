const { pool } = require('./database');

const migrate = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('🚀 Running migrations...');

    await connection.query(`CREATE DATABASE IF NOT EXISTS property_rental`);
    await connection.query(`USE property_rental`);

    // Drop tables if exist to ensure fresh schema
    const tables = ['messages', 'wishlists', 'notifications', 'reviews', 'maintenance_requests', 'payments', 'bookings', 'properties', 'users'];
    for (const table of tables) {
      await connection.query(`DROP TABLE IF EXISTS ${table}`);
    }

    // Users table
    await connection.query(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'owner', 'tenant') DEFAULT 'tenant',
        phone VARCHAR(20),
        avatar VARCHAR(500),
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Properties table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        owner_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(500) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'India',
        zip_code VARCHAR(20),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        price DECIMAL(10, 2) NOT NULL,
        price_type ENUM('per_month', 'per_day', 'per_week') DEFAULT 'per_month',
        property_type ENUM('apartment', 'house', 'villa', 'studio', 'commercial') DEFAULT 'apartment',
        bedrooms INT DEFAULT 1,
        bathrooms INT DEFAULT 1,
        area_sqft DECIMAL(10, 2),
        amenities JSON,
        images JSON,
        is_available BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
        avg_rating DECIMAL(3, 2) DEFAULT 0,
        total_reviews INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Bookings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        tenant_id INT NOT NULL,
        property_id INT NOT NULL,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        total_days INT NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'rejected') DEFAULT 'pending',
        cancellation_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      )
    `);

    // Payments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        booking_id INT NOT NULL,
        tenant_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        payment_method ENUM('stripe', 'bank_transfer', 'cash') DEFAULT 'stripe',
        stripe_payment_intent_id VARCHAR(255),
        stripe_charge_id VARCHAR(255),
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        payment_date TIMESTAMP,
        receipt_url VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Maintenance Requests table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS maintenance_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        property_id INT NOT NULL,
        tenant_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category ENUM('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'other') DEFAULT 'other',
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
        images JSON,
        owner_notes TEXT,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Reviews table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        user_id INT NOT NULL,
        property_id INT NOT NULL,
        booking_id INT,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        is_approved BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
        UNIQUE KEY unique_booking_review (user_id, booking_id)
      )
    `);

    // Notifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('booking', 'payment', 'maintenance', 'review', 'system') DEFAULT 'system',
        reference_id INT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Wishlists table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS wishlists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        property_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        UNIQUE KEY unique_wishlist (user_id, property_id)
      )
    `);

    // Chat messages table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        property_id INT,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
      )
    `);

    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    connection.release();
  }
};

migrate();

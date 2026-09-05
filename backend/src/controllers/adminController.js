const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const MaintenanceRequest = require('../models/MaintenanceRequest');

// GET /api/admin/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const owners = await User.countDocuments({ role: 'owner' });
    const tenants = await User.countDocuments({ role: 'tenant' });
    const users = { total: totalUsers, owners, tenants };

    const totalProperties = await Property.countDocuments();
    const available = await Property.countDocuments({ is_available: true });
    const activeProps = await Property.countDocuments({ status: 'active' });
    const properties = { total: totalProperties, available, active: activeProps };

    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const bookings = { total: totalBookings, confirmed: confirmedBookings, pending: pendingBookings };

    const totalPayments = await Payment.countDocuments({ status: 'completed' });
    const completedPayments = await Payment.find({ status: 'completed' });
    const totalRevenue = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const payments = { total: totalPayments, revenue: totalRevenue };

    const totalMaintenance = await MaintenanceRequest.countDocuments();
    const openMaint = await MaintenanceRequest.countDocuments({ status: 'open' });
    const inProgressMaint = await MaintenanceRequest.countDocuments({ status: 'in_progress' });
    const maintenance = { total: totalMaintenance, open: openMaint, in_progress: inProgressMaint };

    const rawRecentBookings = await Booking.find()
      .populate('property_id', 'title')
      .populate('tenant_id', 'name')
      .sort({ created_at: -1 })
      .limit(5);

    const recentBookings = rawRecentBookings.map((b) => {
      const obj = b.toJSON();
      if (b.property_id && typeof b.property_id === 'object') obj.property_title = b.property_id.title;
      if (b.tenant_id && typeof b.tenant_id === 'object') obj.tenant_name = b.tenant_id.name;
      return obj;
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          payment_date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$payment_date' } },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
        },
      },
      { $project: { _id: 0, month: '$_id', revenue: 1, transactions: 1 } },
      { $sort: { month: 1 } },
    ]);

    res.json({
      success: true,
      data: { users, properties, bookings, payments, maintenance, recentBookings, monthlyRevenue },
    });
  } catch (error) { next(error); }
};

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { role: { $ne: 'admin' } };
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) { next(error); }
};

// PUT /api/admin/users/:id/toggle
const toggleUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.is_active = !user.is_active;
    await user.save();

    res.json({ success: true, message: `User ${user.is_active ? 'activated' : 'deactivated'}` });
  } catch (error) { next(error); }
};

// GET /api/admin/properties
const getAllProperties = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;

    const properties = await Property.find(filter)
      .populate('owner_id', 'name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Property.countDocuments(filter);

    const formattedProperties = properties.map((p) => {
      const obj = p.toJSON();
      if (p.owner_id && typeof p.owner_id === 'object') obj.owner_name = p.owner_id.name;
      return obj;
    });

    res.json({ success: true, data: formattedProperties, pagination: { total } });
  } catch (error) { next(error); }
};

module.exports = { getDashboard, getUsers, toggleUser, getAllProperties };

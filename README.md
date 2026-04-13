# 🏠 NestFinder – Property Rental Management System

A full-stack property rental platform built with **React + Node.js + MySQL**, featuring role-based dashboards for Admins, Owners, and Tenants.

---

## 📸 Features at a Glance

| Feature | Details |
|---|---|
| **Authentication** | JWT-based login/register with bcrypt password hashing |
| **Role-Based Access** | Admin · Owner · Tenant |
| **Property Listings** | Add/edit/delete with images, filters, search |
| **Booking System** | Calendar date-picker with conflict validation |
| **Stripe Payments** | Card payments, payment history, webhooks |
| **Maintenance Requests** | Tenants raise issues · Owners respond |
| **Reviews & Ratings** | Verified reviews tied to completed bookings |
| **Notifications** | In-app alerts for bookings, payments, maintenance |
| **Wishlist** | Save favourite properties |
| **Admin Panel** | User management, revenue charts, system overview |
| **Responsive UI** | Mobile-friendly React + Tailwind CSS |

---

## 🗂️ Project Structure

```
property-rental/
├── backend/
│   ├── src/
│   │   ├── config/        # DB connection, migrations, seed
│   │   ├── controllers/   # Business logic (auth, property, booking…)
│   │   ├── middleware/    # JWT auth, error handler, file upload
│   │   ├── routes/        # Express route definitions
│   │   └── utils/         # Email, notifications
│   ├── uploads/           # Uploaded property images (auto-created)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI (Navbar, PropertyCard, Calendar…)
│   │   ├── context/       # AuthContext
│   │   ├── pages/         # Auth, Tenant, Owner, Admin pages
│   │   └── services/      # Axios API calls
│   ├── .env.example
│   └── package.json
└── docs/
    └── API.md             # Full API documentation
```

---

## ⚙️ Prerequisites

- **Node.js** v18+
- **MySQL** 8.0+
- **npm** v9+
- A **Stripe** account (free test mode is fine)

---

## 🚀 Setup Instructions

### 1. Clone / Extract the project

```bash
cd property-rental
```

### 2. Set up the Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your values:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=property_rental
JWT_SECRET=change_this_to_a_long_random_string
STRIPE_SECRET_KEY=sk_test_xxxxx
```

**Run database migrations:**
```bash
npm run migrate
```

**Seed demo data:**
```bash
npm run seed
```

**Start the backend:**
```bash
npm run dev       # Development (nodemon)
npm start         # Production
```

Backend runs at: `http://localhost:5000`

---

### 3. Set up the Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

**Start the frontend:**
```bash
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🔐 Demo Credentials

After seeding, use these test accounts:

| Role | Email | Password |
|---|---|---|
| Admin | admin@rental.com | Password123! |
| Owner | owner1@rental.com | Password123! |
| Tenant | tenant1@rental.com | Password123! |

---

## 💳 Stripe Test Cards

| Card | Number |
|---|---|
| Success | `4242 4242 4242 4242` |
| Declined | `4000 0000 0000 0002` |
| 3D Secure | `4000 0025 0000 3155` |

Use any future expiry (e.g. `12/29`) and any 3-digit CVV.

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `users` | All users with role (admin/owner/tenant) |
| `properties` | Property listings with images, amenities |
| `bookings` | Booking requests with date range + status |
| `payments` | Payment records linked to bookings (Stripe) |
| `maintenance_requests` | Tenant issue reports |
| `reviews` | Ratings + comments linked to bookings |
| `notifications` | In-app notification inbox |
| `wishlists` | Saved properties per user |
| `messages` | Direct messages (schema ready) |

---

## 🌐 API Overview

See [`docs/API.md`](docs/API.md) for full documentation.

Quick endpoints:
- `POST /api/auth/login` – Login
- `GET  /api/properties` – Browse listings
- `POST /api/bookings` – Create booking
- `POST /api/payments/create-intent` – Start payment
- `GET  /api/admin/dashboard` – Admin stats

---

## 🚀 Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
```

Or connect GitHub repo to Vercel — set env var `VITE_STRIPE_PUBLISHABLE_KEY`.

### Backend → Render / Railway

1. Push backend to GitHub
2. Create a new Web Service on Render/Railway
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add all `.env` variables in the dashboard

### Database → PlanetScale / Railway MySQL

1. Create a MySQL database
2. Update `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in production env
3. Run `npm run migrate` against production DB

---

## 🔧 Available Scripts

### Backend
| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Start production server |
| `npm run migrate` | Create all database tables |
| `npm run seed` | Populate with demo data |

### Frontend
| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

---

## 🛣️ Roadmap / Bonus Features

- [ ] Real-time chat (Socket.io) between tenant & owner
- [ ] Google Maps integration for property location
- [ ] Email notifications (configure SMTP in .env)
- [ ] PDF rent receipts
- [ ] Tenant credit scoring
- [ ] Multi-language support

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Charts | Recharts |
| Payments | Stripe.js + React Stripe |
| Backend | Node.js, Express 4 |
| Database | MySQL 8 with mysql2 |
| Auth | JWT + bcryptjs |
| File Upload | Multer |
| Email | Nodemailer |
| Validation | express-validator |

---

## 📄 License

MIT — free to use and modify.

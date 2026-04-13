# 📚 API Documentation – Property Rental Management System

Base URL: `http://localhost:5000/api`

All protected routes require: `Authorization: Bearer <token>`

---

## 🔐 Auth API

### POST `/auth/register`
Register a new user.

**Body:**
```json
{ "name": "Rahul Sharma", "email": "rahul@email.com", "password": "Password123!", "role": "tenant", "phone": "+91-9876543210" }
```
**Response:** `{ success, data: { token, user } }`

---

### POST `/auth/login`
Login and receive JWT token.

**Body:**
```json
{ "email": "rahul@email.com", "password": "Password123!" }
```
**Response:** `{ success, data: { token, user } }`

---

### GET `/auth/me` 🔒
Get current user profile.

---

### PUT `/auth/profile` 🔒
Update name, phone, avatar (multipart/form-data).

---

### PUT `/auth/change-password` 🔒
**Body:** `{ "currentPassword": "...", "newPassword": "..." }`

---

## 🏠 Properties API

### GET `/properties`
List properties with optional filters.

**Query params:**
| Param | Type | Description |
|---|---|---|
| search | string | Search title/location |
| city | string | Filter by city |
| min_price | number | Minimum price |
| max_price | number | Maximum price |
| property_type | string | apartment/house/villa/studio/commercial |
| bedrooms | number | Minimum bedrooms |
| available | boolean | Only available properties |
| featured | boolean | Featured only |
| page | number | Page number (default: 1) |
| limit | number | Per page (default: 12) |

---

### GET `/properties/:id`
Get single property with reviews and owner info.

---

### POST `/properties` 🔒 (owner/admin)
Create property. Multipart/form-data with optional `images[]`.

**Body fields:** `title`, `location`, `city`, `state`, `price`, `price_type`, `property_type`, `bedrooms`, `bathrooms`, `area_sqft`, `amenities` (JSON array), `description`

---

### PUT `/properties/:id` 🔒 (owner/admin)
Update property fields. Same multipart format.

---

### DELETE `/properties/:id` 🔒 (owner/admin)
Delete property and its bookings.

---

### GET `/properties/my-properties` 🔒 (owner)
Get owner's properties with revenue/booking stats.

---

### POST `/properties/:id/wishlist` 🔒
Toggle wishlist for authenticated user.

---

## 📅 Bookings API

### POST `/bookings` 🔒 (tenant)
Create a booking request. Validates no date conflicts.

**Body:**
```json
{ "property_id": 1, "check_in": "2025-06-01", "check_out": "2025-08-31", "notes": "..." }
```

---

### GET `/bookings` 🔒
Get bookings (scoped to user role).

**Query:** `status`, `page`, `limit`

---

### GET `/bookings/:id` 🔒
Get single booking with full details.

---

### PUT `/bookings/:id/status` 🔒
Update booking status.

**Body:** `{ "status": "confirmed|rejected|cancelled|completed", "cancellation_reason": "..." }`

- Owner can: `confirmed`, `rejected`, `completed`
- Tenant can: `cancelled`

---

### GET `/bookings/availability/:propertyId`
Get booked date ranges for a property (public).

---

## 💳 Payments API

### POST `/payments/create-intent` 🔒 (tenant)
Create Stripe PaymentIntent.

**Body:** `{ "booking_id": 1 }`

**Response:** `{ clientSecret, amount }`

---

### POST `/payments/confirm` 🔒
Confirm payment after Stripe success.

**Body:** `{ "payment_intent_id": "pi_xxx" }`

---

### POST `/payments/webhook`
Stripe webhook endpoint (raw body). Register at: `https://yourdomain.com/api/payments/webhook`

---

### GET `/payments/history` 🔒
Get payment history (scoped by role).

---

## 🔧 Maintenance API

### POST `/maintenance` 🔒 (tenant)
Submit a maintenance request. Multipart/form-data with optional `images[]`.

**Body:** `property_id`, `title`, `description`, `category`, `priority`

Categories: `plumbing | electrical | hvac | appliance | structural | pest_control | other`
Priority: `low | medium | high | urgent`

---

### GET `/maintenance` 🔒
List maintenance requests (scoped by role).

**Query:** `status`, `priority`, `page`, `limit`

---

### PUT `/maintenance/:id` 🔒 (owner/admin)
Update request status and add owner notes.

**Body:** `{ "status": "in_progress|resolved|closed", "owner_notes": "..." }`

---

## ⭐ Reviews API

### POST `/reviews` 🔒 (tenant)
Submit a review. Requires a confirmed/completed booking.

**Body:**
```json
{ "property_id": 1, "booking_id": 2, "rating": 5, "comment": "Great place!" }
```

---

### GET `/reviews/property/:propertyId`
Get all approved reviews for a property with rating stats.

---

## 🔔 Notifications API

### GET `/notifications` 🔒
Get user notifications with unread count.

### PUT `/notifications/read-all` 🔒
Mark all as read.

### PUT `/notifications/:id/read` 🔒
Mark single notification as read.

---

## 🛡️ Admin API (admin only)

### GET `/admin/dashboard`
System-wide stats: users, properties, bookings, revenue, maintenance, monthly revenue chart data.

### GET `/admin/users`
List all users. Query: `role`, `search`, `page`, `limit`

### PUT `/admin/users/:id/toggle`
Activate / deactivate a user account.

### GET `/admin/properties`
List all properties. Query: `status`, `page`, `limit`

---

## 📊 Response Format

All responses follow:
```json
{
  "success": true,
  "message": "Optional message",
  "data": {},
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [{ "field": "email", "message": "Valid email required" }]
}
```

---

## 🔑 HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (missing/expired token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 409 | Conflict (duplicate/date overlap) |
| 500 | Internal Server Error |

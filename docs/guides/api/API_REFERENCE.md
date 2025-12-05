# 📡 API Endpoints Reference

Quick reference for all available REST API endpoints.

**Base URL**: `http://localhost:3001/api` (dev) or `https://your-backend.repl.co/api` (prod)

**Authentication**: Include `Authorization: Bearer <accessToken>` header for protected endpoints.

---

## 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Register new user |
| POST | `/login` | ❌ | Login user |
| POST | `/refresh` | ❌ | Refresh access token |
| POST | `/logout` | ❌ | Logout user |
| GET | `/me` | ✅ | Get current user |
| PUT | `/password` | ✅ | Update password |
| POST | `/forgot-password` | ❌ | Request password reset |

### Examples

**Register**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe"
}
```

**Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "email": "...", "role": "USER" },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

## 👤 Users (`/api/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ Admin | Get all users |
| GET | `/:userId` | ✅ | Get user profile |
| PUT | `/:userId` | ✅ Owner/Admin | Update profile |
| PUT | `/:userId/settings` | ✅ Owner/Admin | Update settings |

### Query Parameters

**GET /** (List users)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search by name or email
- `role` - Filter by role (ADMIN, USER, CUSTOMER)

### Examples

**Get All Users**
```bash
GET /api/users?page=1&limit=20&search=john&role=USER
Authorization: Bearer <accessToken>
```

**Update Profile**
```bash
PUT /api/users/:userId
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "fullName": "John Doe Updated",
  "phone": "+1234567890",
  "bio": "Software developer"
}
```

---

## 🏪 Stores (`/api/stores`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | Get all stores |
| GET | `/:storeId` | ❌ | Get store by ID |
| GET | `/slug/:slug` | ❌ | Get store by slug |
| POST | `/` | ✅ | Create store |
| PUT | `/:storeId` | ✅ Owner/Admin | Update store |
| DELETE | `/:storeId` | ✅ Owner/Admin | Delete store |

### Query Parameters

**GET /** (List stores)
- `page` - Page number
- `limit` - Items per page
- `userId` - Filter by owner
- `search` - Search by name

### Examples

**Get Store by Slug**
```bash
GET /api/stores/slug/my-awesome-store
```

**Create Store**
```bash
POST /api/stores
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "My Store",
  "slug": "my-store",
  "description": "Best products here",
  "currency": "BDT",
  "shippingInside": 60,
  "shippingOutside": 120
}
```

---

## 📦 Products (`/api/products`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | Get all products |
| GET | `/:productId` | ❌ | Get product by ID |
| POST | `/` | ✅ | Create product |
| PUT | `/:productId` | ✅ Owner/Admin | Update product |
| DELETE | `/:productId` | ✅ Owner/Admin | Delete product |

### Query Parameters

**GET /** (List products)
- `page` - Page number
- `limit` - Items per page
- `storeId` - Filter by store
- `categoryId` - Filter by category
- `search` - Search by name/description
- `isActive` - Filter active/inactive
- `minPrice` - Minimum price
- `maxPrice` - Maximum price

### Examples

**List Products**
```bash
GET /api/products?storeId=abc123&categoryId=xyz&minPrice=100&maxPrice=5000&page=1&limit=20
```

**Create Product**
```bash
POST /api/products
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "storeId": "abc123",
  "categoryId": "xyz456",
  "name": "Awesome Product",
  "description": "Product description",
  "price": 999.99,
  "comparePrice": 1299.99,
  "stock": 50,
  "sku": "PROD-001",
  "imageUrl": "https://example.com/image.jpg",
  "images": [
    { "url": "https://example.com/1.jpg", "altText": "Front view", "position": 0 },
    { "url": "https://example.com/2.jpg", "altText": "Back view", "position": 1 }
  ],
  "attributes": [
    { "name": "Color", "value": "Blue" },
    { "name": "Size", "value": "Large" }
  ]
}
```

---

## 📂 Categories (`/api/categories`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | Get all categories |
| GET | `/:categoryId` | ❌ | Get category by ID |
| POST | `/` | ✅ | Create category |
| PUT | `/:categoryId` | ✅ | Update category |
| DELETE | `/:categoryId` | ✅ | Delete category |

### Query Parameters

**GET /** (List categories)
- `storeId` - Filter by store

### Examples

**Get Categories**
```bash
GET /api/categories?storeId=abc123
```

**Create Category**
```bash
POST /api/categories
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "storeId": "abc123",
  "name": "Electronics",
  "description": "Electronic items",
  "imageUrl": "https://example.com/cat.jpg",
  "displayOrder": 1
}
```

---

## 🛒 Orders (`/api/orders`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | Get all orders |
| GET | `/:orderId` | ✅ | Get order by ID |
| POST | `/` | ✅ | Create order |
| PUT | `/:orderId` | ✅ | Update order |
| DELETE | `/:orderId` | ✅ | Delete order |

### Query Parameters

**GET /** (List orders)
- `page` - Page number
- `limit` - Items per page
- `storeId` - Filter by store
- `status` - Filter by status
- `customerId` - Filter by customer

### Examples

**Create Order**
```bash
POST /api/orders
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "storeId": "abc123",
  "customerId": "cust456",
  "customerName": "John Doe",
  "customerPhone": "+1234567890",
  "customerEmail": "john@example.com",
  "items": [
    {
      "productId": "prod789",
      "productName": "Product 1",
      "quantity": 2,
      "price": 999.99
    }
  ],
  "subtotal": 1999.98,
  "shippingCharge": 60,
  "discount": 100,
  "total": 1959.98,
  "paymentMethod": "cod",
  "shippingAddress": {
    "name": "John Doe",
    "phone": "+1234567890",
    "address": "123 Main St",
    "city": "Dhaka",
    "district": "Dhaka",
    "postalCode": "1200"
  }
}
```

---

## 👥 Customers (`/api/customers`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | Get all customers |
| POST | `/` | ✅ | Create customer |
| PUT | `/:customerId` | ✅ | Update customer |

### Query Parameters

**GET /** (List customers)
- `page` - Page number
- `limit` - Items per page
- `storeId` - Filter by store
- `search` - Search by name/phone/email

---

## 🧾 Invoices (`/api/invoices`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | Get all invoices |
| POST | `/` | ✅ | Create invoice |

---

## 📝 Forms (`/api/forms`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | Get all forms |
| POST | `/` | ✅ | Create form |
| POST | `/:formId/submit` | ❌ | Submit form |

---

## ⚙️ Config (`/api/config`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | Get app config |
| PUT | `/` | ✅ Admin | Update config |

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "field": "Error details"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved",
  "data": {
    "items": [...],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "pages": 5
    }
  }
}
```

---

## 🔒 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

---

## 💡 Usage Tips

### JavaScript/TypeScript
```typescript
import apiClient from '@/lib/apiClient';

// Authenticated request
const { data } = await apiClient.get('/products');

// With query params
const { data } = await apiClient.get('/products', {
  params: { storeId: 'abc', page: 1, limit: 20 }
});

// POST request
const { data } = await apiClient.post('/products', {
  name: 'New Product',
  price: 999
});
```

### cURL
```bash
# GET request
curl -X GET "http://localhost:3001/api/products?page=1&limit=20"

# Authenticated GET
curl -X GET "http://localhost:3001/api/orders" \
  -H "Authorization: Bearer YOUR_TOKEN"

# POST request
curl -X POST "http://localhost:3001/api/products" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Product","price":999,"storeId":"abc"}'
```

---

**Quick Access**: Bookmark this page for rapid API reference during development!

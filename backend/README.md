# Lovable Backend - Node.js REST API

Complete Node.js backend for the Lovable e-commerce platform, replacing Supabase with custom REST API endpoints.

## 🛠️ Tech Stack

- **Language**: Node.js (JavaScript ES Modules)
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: validator
- **CORS**: cors middleware

## 📁 Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   └── database.js        # Prisma client
│   ├── controllers/           # Business logic
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── product.controller.js
│   │   ├── order.controller.js
│   │   ├── store.controller.js
│   │   ├── category.controller.js
│   │   ├── customer.controller.js
│   │   ├── invoice.controller.js
│   │   ├── form.controller.js
│   │   └── config.controller.js
│   ├── middleware/            # Express middleware
│   │   ├── auth.js           # JWT authentication
│   │   ├── authorize.js      # Role-based authorization
│   │   ├── validate.js       # Request validation
│   │   ├── errorHandler.js   # Global error handler
│   │   └── notFoundHandler.js
│   ├── routes/               # API routes
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── product.routes.js
│   │   ├── order.routes.js
│   │   ├── store.routes.js
│   │   ├── category.routes.js
│   │   ├── customer.routes.js
│   │   ├── invoice.routes.js
│   │   ├── form.routes.js
│   │   └── config.routes.js
│   ├── utils/                # Utility functions
│   │   ├── apiResponse.js    # Standard response format
│   │   ├── jwt.js            # JWT utilities
│   │   ├── password.js       # Password hashing
│   │   └── validation.js     # Input validation
│   └── server.js             # Express server
├── .env.example              # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- npm or yarn

### Installation

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` file:
   ```env
   DATABASE_URL="postgresql://username:password@host:5432/database"
   PORT=3001
   JWT_ACCESS_SECRET=your-access-secret-here
   JWT_REFRESH_SECRET=your-refresh-secret-here
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

5. **Run database migrations**
   ```bash
   npm run prisma:migrate
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

Server will start on `http://localhost:3001`

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login user | No |
| POST | `/refresh` | Refresh access token | No |
| POST | `/logout` | Logout user | No |
| GET | `/me` | Get current user | Yes |
| PUT | `/password` | Update password | Yes |
| POST | `/forgot-password` | Request password reset | No |

### Users (`/api/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all users (admin) | Yes (Admin) |
| GET | `/:userId` | Get user profile | Yes |
| PUT | `/:userId` | Update user profile | Yes (Owner/Admin) |
| PUT | `/:userId/settings` | Update user settings | Yes (Owner/Admin) |

### Stores (`/api/stores`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all stores | No |
| GET | `/:storeId` | Get store by ID | No |
| GET | `/slug/:slug` | Get store by slug | No |
| POST | `/` | Create store | Yes |
| PUT | `/:storeId` | Update store | Yes (Owner/Admin) |
| DELETE | `/:storeId` | Delete store | Yes (Owner/Admin) |

### Products (`/api/products`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all products | No |
| GET | `/:productId` | Get product by ID | No |
| POST | `/` | Create product | Yes |
| PUT | `/:productId` | Update product | Yes (Owner/Admin) |
| DELETE | `/:productId` | Delete product | Yes (Owner/Admin) |

### Categories (`/api/categories`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all categories | No |
| GET | `/:categoryId` | Get category by ID | No |
| POST | `/` | Create category | Yes |
| PUT | `/:categoryId` | Update category | Yes |
| DELETE | `/:categoryId` | Delete category | Yes |

### Orders (`/api/orders`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all orders | Yes |
| GET | `/:orderId` | Get order by ID | Yes |
| POST | `/` | Create order | Yes |
| PUT | `/:orderId` | Update order | Yes |
| DELETE | `/:orderId` | Delete order | Yes |

### Customers (`/api/customers`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all customers | Yes |
| POST | `/` | Create customer | Yes |
| PUT | `/:customerId` | Update customer | Yes |

### Configuration (`/api/config`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get app config | No |
| PUT | `/` | Update app config | Yes (Admin) |

## 🔐 Authentication

The API uses JWT-based authentication:

1. **Login/Register** to receive `accessToken` and `refreshToken`
2. **Include token** in requests: `Authorization: Bearer <accessToken>`
3. **Refresh token** when access token expires using `/api/auth/refresh`

## 📝 Request/Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": { ... }
}
```

## 🗄️ Database Schema

The Prisma schema includes:
- **Users & Authentication**: users, profiles, user_roles, refresh_tokens
- **E-commerce**: stores, products, categories, orders, customers
- **Supporting**: forms, invoices, admin_config

## 🌐 Deployment to Replit

### Method 1: Direct Import

1. Go to [Replit](https://replit.com)
2. Click "Create Repl"
3. Choose "Import from GitHub" or upload files
4. Select "Node.js" as language

### Method 2: Manual Setup

1. Create new Node.js Repl
2. Upload backend files
3. Configure Secrets (Environment Variables):
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `CORS_ORIGIN`

4. Add `.replit` file:
   ```toml
   run = "npm start"
   entrypoint = "src/server.js"
   
   [nix]
   channel = "stable-22_11"
   
   [deployment]
   run = ["sh", "-c", "npm run prisma:deploy && npm start"]
   ```

5. Install dependencies and run:
   ```bash
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm start
   ```

### Database Setup on Replit

**Option 1: Use Replit PostgreSQL**
- Enable PostgreSQL in Replit
- Use provided `DATABASE_URL`

**Option 2: External PostgreSQL**
- Use services like: Railway, Supabase (DB only), Neon, or Heroku Postgres
- Add connection string to Secrets

## 🔧 Development

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Create/apply migrations
npm run prisma:migrate

# Open Prisma Studio (DB GUI)
npm run prisma:studio

# Run development server
npm run dev

# Run production server
npm start
```

## 🛡️ Security Features

- ✅ JWT authentication with access & refresh tokens
- ✅ Password hashing with bcrypt
- ✅ CORS protection
- ✅ Input validation
- ✅ SQL injection prevention (Prisma ORM)
- ✅ Role-based access control
- ✅ Error handling without information leakage

## 📚 Next Steps

1. **Frontend Integration**: Update React frontend to use these REST endpoints
2. **File Upload**: Implement file upload for images (currently just URLs)
3. **Email Service**: Add email functionality for password reset, notifications
4. **Rate Limiting**: Add rate limiting middleware
5. **Logging**: Implement request logging
6. **Testing**: Add unit and integration tests
7. **Documentation**: Generate API docs with Swagger/OpenAPI

## 🤝 Support

For issues or questions, please refer to the main project documentation.

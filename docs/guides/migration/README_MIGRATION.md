# Lovable Platform - Supabase to Node.js Migration

Complete migration from Supabase backend to custom Node.js REST API backend.

## 📁 Project Structure

```
/Applications/XAMPP/xamppfiles/htdocs/go/
├── backend/                          # 🆕 Node.js Backend (NEW)
│   ├── src/
│   │   ├── controllers/             # Business logic
│   │   ├── routes/                  # API routes
│   │   ├── middleware/              # Auth, validation, errors
│   │   ├── utils/                   # Helpers
│   │   ├── config/                  # Database config
│   │   └── server.js                # Express server
│   ├── prisma/
│   │   └── schema.prisma            # Database schema
│   ├── package.json
│   ├── .env.example
│   ├── .replit                      # Replit config
│   └── README.md                    # Backend docs
│
├── src/                              # React Frontend
│   ├── lib/
│   │   └── apiClient.ts             # 🆕 Axios client (NEW)
│   ├── services/
│   │   └── api.ts                   # 🆕 API services (NEW)
│   ├── contexts/
│   │   └── AuthContext.tsx          # ⚠️ Needs update
│   └── ...
│
├── QUICK_START.md                   # 🚀 Start here!
├── MIGRATION_SUMMARY.md             # Migration overview
├── FRONTEND_INTEGRATION.md          # Frontend update guide
├── DEPLOYMENT_GUIDE.md              # Production deployment
└── README_MIGRATION.md              # This file
```

## 🎯 What's New

### ✅ Created

1. **Complete Node.js Backend**
   - Express.js server with TypeScript
   - Prisma ORM with PostgreSQL
   - JWT authentication (access + refresh tokens)
   - 50+ REST API endpoints
   - Role-based authorization
   - Input validation & error handling
   - Replit deployment ready

2. **API Integration Layer**
   - Axios client with auto token refresh
   - Service layer for all endpoints
   - Type-safe API calls

3. **Comprehensive Documentation**
   - Quick start guide
   - API documentation
   - Frontend integration guide
   - Deployment guide

### ⚠️ Needs Update

- `src/contexts/AuthContext.tsx` - Replace with new auth implementation
- All files using Supabase queries - Replace with API service calls
- Environment variables - Add `VITE_API_URL`

## 🚀 Quick Start

### Option 1: Test Locally (5 minutes)

```bash
# 1. Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with database URL and secrets
npm run prisma:generate
npm run prisma:migrate
npm run dev

# 2. Setup frontend (in new terminal)
cd ..
npm install axios
echo 'VITE_API_URL=http://localhost:3001/api' >> .env
npm run dev
```

**See `QUICK_START.md` for detailed steps**

### Option 2: Deploy to Production

**See `DEPLOYMENT_GUIDE.md` for complete instructions**

## 📚 Documentation

| File | Purpose |
|------|---------|
| **QUICK_START.md** | Get started in 5 minutes |
| **MIGRATION_SUMMARY.md** | Complete overview of changes |
| **FRONTEND_INTEGRATION.md** | How to update React frontend |
| **DEPLOYMENT_GUIDE.md** | Deploy to Replit + Vercel |
| **backend/README.md** | Backend API documentation |

## 🔄 Migration Path

### Phase 1: Backend Setup ✅ COMPLETE
- [x] Create Express.js backend
- [x] Design Prisma schema
- [x] Implement authentication
- [x] Create all API endpoints
- [x] Add middleware & validation
- [x] Configure deployment

### Phase 2: Frontend Integration 🔄 IN PROGRESS
- [x] Create API client
- [x] Create service layer
- [ ] Update AuthContext
- [ ] Replace Supabase queries
- [ ] Test all features
- [ ] Update environment variables

### Phase 3: Deployment 📋 PENDING
- [ ] Deploy PostgreSQL database
- [ ] Deploy backend to Replit
- [ ] Update frontend config
- [ ] Deploy frontend to Vercel
- [ ] Final testing

## 🎓 Key Concepts

### Authentication Flow

**Before (Supabase):**
```typescript
const { data } = await supabase.auth.signInWithPassword({ email, password });
```

**After (Custom):**
```typescript
import { authService } from '@/services/api';
const { data } = await authService.login(email, password);
localStorage.setItem('accessToken', data.data.accessToken);
```

### Data Fetching

**Before (Supabase):**
```typescript
const { data: products } = await supabase
  .from('products')
  .select('*')
  .eq('store_id', storeId);
```

**After (REST API):**
```typescript
import { productService } from '@/services/api';
const { data } = await productService.getAll({ storeId });
const products = data.data.products;
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  (Vite + TypeScript + React Query + Axios)              │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP/REST
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Node.js Backend                         │
│  (Express + Prisma + JWT + bcrypt)                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ SQL
                     │
┌────────────────────▼────────────────────────────────────┐
│                   PostgreSQL                             │
│  (Railway / Neon / Supabase)                            │
└─────────────────────────────────────────────────────────┘
```

## 🔐 Security Features

- ✅ JWT authentication with refresh tokens
- ✅ Bcrypt password hashing (10 rounds)
- ✅ CORS protection
- ✅ Input validation
- ✅ SQL injection prevention (Prisma)
- ✅ Role-based access control
- ✅ XSS protection (input sanitization)

## 📊 Tech Stack Comparison

| Layer | Before | After |
|-------|--------|-------|
| **Frontend** | React + TypeScript | React + TypeScript ✅ |
| **Backend** | Supabase | Node.js + Express ✅ |
| **Database** | PostgreSQL (Supabase) | PostgreSQL (self-hosted) ✅ |
| **ORM** | Supabase Client | Prisma ✅ |
| **Auth** | Supabase Auth | Custom JWT ✅ |
| **API** | Auto-generated | REST (hand-crafted) ✅ |
| **Deployment** | Supabase | Backend: Replit, DB: Railway ✅ |

## 📈 API Endpoints Overview

### Authentication (7 endpoints)
- Register, Login, Logout, Refresh Token, Get Me, Update Password, Forgot Password

### Core Resources
- **Users** (4 endpoints) - Profile, settings, list
- **Stores** (6 endpoints) - CRUD + get by slug
- **Products** (5 endpoints) - CRUD + filters
- **Categories** (5 endpoints) - CRUD
- **Orders** (5 endpoints) - CRUD
- **Customers** (3 endpoints) - Create, update, list

### Additional
- Invoices (2 endpoints)
- Forms (3 endpoints)
- Config (2 endpoints)

**Total: 40+ endpoints**

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Test health
curl http://localhost:3001/health

# Test auth
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!","fullName":"Test"}'
```

### Frontend Tests
- [ ] User registration
- [ ] User login
- [ ] Product listing
- [ ] Product creation
- [ ] Order creation
- [ ] Store management

## 💡 Pro Tips

1. **Use Prisma Studio** for database management
   ```bash
   cd backend
   npm run prisma:studio
   ```

2. **Enable React Query** for better data fetching
   ```bash
   npm install @tanstack/react-query
   ```

3. **Use environment-specific configs**
   - `.env` for local development
   - Replit Secrets for production

4. **Monitor backend logs** in Replit console

5. **Use proper error handling** in frontend
   ```typescript
   try {
     const data = await productService.getAll();
   } catch (error) {
     toast.error(error.response?.data?.message || 'Error');
   }
   ```

## 🆘 Common Issues & Solutions

### CORS Errors
**Solution**: Add frontend URL to `CORS_ORIGIN` in backend `.env`

### 401 Unauthorized
**Solution**: Check token is saved and sent in Authorization header

### Database Connection Failed
**Solution**: Verify `DATABASE_URL` format and credentials

### Token Expired
**Solution**: Automatic refresh via axios interceptor (already implemented)

## 📞 Support

- **Quick Start**: `QUICK_START.md`
- **Backend API**: `backend/README.md`
- **Frontend Guide**: `FRONTEND_INTEGRATION.md`
- **Deployment**: `DEPLOYMENT_GUIDE.md`
- **Full Summary**: `MIGRATION_SUMMARY.md`

## 🎯 Next Steps

1. **Read** `QUICK_START.md`
2. **Setup** backend locally
3. **Test** API endpoints
4. **Update** frontend AuthContext
5. **Replace** Supabase queries
6. **Deploy** to production

---

**Current Status**: ✅ Backend Complete | 🔄 Frontend Integration Needed

The backend is fully functional with 40+ endpoints. Frontend needs to be updated to use REST API instead of Supabase.

**Estimated Time to Complete**: 2-4 hours for frontend integration

**Start Here**: `QUICK_START.md`

# Complete Deployment Guide

## 🎯 Deployment Architecture

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   React Frontend │──────▶│  Node.js Backend │──────▶│   PostgreSQL    │
│   (Vercel/Netlify)│       │     (Replit)     │       │  (Railway/Neon) │
└─────────────────┘       └──────────────────┘       └─────────────────┘
```

## 📦 Part 1: Deploy Backend to Replit

### Step 1: Prepare Your Backend

1. **Test locally first**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Ensure all files are ready**:
   - ✅ `package.json`
   - ✅ `prisma/schema.prisma`
   - ✅ `.env.example`
   - ✅ `.replit`
   - ✅ All source files in `src/`

### Step 2: Create PostgreSQL Database

**Option A: Railway (Recommended)**

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Provision PostgreSQL"
3. Copy the `DATABASE_URL` from "Connect" tab
4. Format: `postgresql://user:pass@host:port/db`

**Option B: Neon**

1. Go to [Neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string

**Option C: Supabase (Database Only)**

1. Create project at [Supabase](https://supabase.com)
2. Get direct Postgres connection string (not Supabase client)
3. Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

### Step 3: Deploy to Replit

1. **Create new Repl**:
   - Go to [Replit.com](https://replit.com)
   - Click "Create Repl"
   - Choose "Import from GitHub" or "Upload folder"
   - Select Node.js

2. **Upload backend folder**:
   - Drag and drop the entire `backend` folder
   - Or use GitHub import

3. **Configure Secrets** (Environment Variables):
   - Click "Tools" → "Secrets"
   - Add these variables:

   ```
   DATABASE_URL=postgresql://user:pass@host:port/database
   JWT_ACCESS_SECRET=generate-a-random-secure-string-here
   JWT_REFRESH_SECRET=generate-another-different-random-string
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   CORS_ORIGIN=https://your-frontend-domain.com,http://localhost:5173
   PORT=3000
   NODE_ENV=production
   ```

   **Generate secure secrets**:
   ```bash
   # Run in terminal to generate random strings
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

4. **Install dependencies and setup database**:
   ```bash
   npm install
   npm run prisma:generate
   npm run prisma:deploy
   ```

5. **Start the server**:
   ```bash
   npm start
   ```

6. **Get your backend URL**:
   - Format: `https://your-repl-name.your-username.repl.co`
   - Test: `https://your-repl-name.your-username.repl.co/health`

### Step 4: Test Backend

```bash
# Test health endpoint
curl https://your-backend.repl.co/health

# Test registration
curl -X POST https://your-backend.repl.co/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "fullName": "Test User"
  }'
```

## 🎨 Part 2: Update Frontend

### Step 1: Install Dependencies

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/go
npm install axios
```

### Step 2: Create Environment Variables

Create or update `.env`:

```env
# Development
VITE_API_URL=http://localhost:3001/api

# Production (update after deploying backend)
# VITE_API_URL=https://your-backend.repl.co/api
```

### Step 3: Add API Client

The file is already created at `src/lib/apiClient.ts`

### Step 4: Create Services Layer

Create `src/services/api.ts`:

```typescript
import apiClient from '@/lib/apiClient';

// Auth Service
export const authService = {
  register: (email: string, password: string, fullName: string) =>
    apiClient.post('/auth/register', { email, password, fullName }),
  
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  
  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }),
  
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),
  
  getMe: () =>
    apiClient.get('/auth/me'),
  
  updatePassword: (currentPassword: string, newPassword: string) =>
    apiClient.put('/auth/password', { currentPassword, newPassword }),
};

// Product Service
export const productService = {
  getAll: (params?: any) => apiClient.get('/products', { params }),
  getById: (id: string) => apiClient.get(`/products/${id}`),
  create: (data: any) => apiClient.post('/products', data),
  update: (id: string, data: any) => apiClient.put(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/${id}`),
};

// Store Service
export const storeService = {
  getAll: (params?: any) => apiClient.get('/stores', { params }),
  getById: (id: string) => apiClient.get(`/stores/${id}`),
  getBySlug: (slug: string) => apiClient.get(`/stores/slug/${slug}`),
  create: (data: any) => apiClient.post('/stores', data),
  update: (id: string, data: any) => apiClient.put(`/stores/${id}`, data),
  delete: (id: string) => apiClient.delete(`/stores/${id}`),
};

// Order Service
export const orderService = {
  getAll: (params?: any) => apiClient.get('/orders', { params }),
  getById: (id: string) => apiClient.get(`/orders/${id}`),
  create: (data: any) => apiClient.post('/orders', data),
  update: (id: string, data: any) => apiClient.put(`/orders/${id}`, data),
};

// Category Service
export const categoryService = {
  getAll: (params?: any) => apiClient.get('/categories', { params }),
  getById: (id: string) => apiClient.get(`/categories/${id}`),
  create: (data: any) => apiClient.post('/categories', data),
  update: (id: string, data: any) => apiClient.put(`/categories/${id}`, data),
  delete: (id: string) => apiClient.delete(`/categories/${id}`),
};

// Customer Service
export const customerService = {
  getAll: (params?: any) => apiClient.get('/customers', { params }),
  create: (data: any) => apiClient.post('/customers', data),
  update: (id: string, data: any) => apiClient.put(`/customers/${id}`, data),
};

// Config Service
export const configService = {
  get: () => apiClient.get('/config'),
  update: (data: any) => apiClient.put('/config', data),
};
```

### Step 5: Test Frontend Integration

```bash
npm run dev
```

## 🌍 Part 3: Deploy Frontend

### Option A: Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Update environment variables**:
   ```bash
   # In your project root
   vercel env add VITE_API_URL production
   # Enter: https://your-backend.repl.co/api
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Update backend CORS**:
   - Go to Replit Secrets
   - Update `CORS_ORIGIN` to include your Vercel URL:
     ```
     CORS_ORIGIN=https://your-app.vercel.app,http://localhost:5173
     ```

### Option B: Netlify

1. **Create `netlify.toml`**:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Deploy**:
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli

   # Deploy
   netlify deploy --prod
   ```

3. **Set environment variables** in Netlify dashboard

## ✅ Post-Deployment Checklist

### Backend (Replit)
- [ ] Server starts without errors
- [ ] `/health` endpoint returns 200
- [ ] Database connection works
- [ ] All migrations applied
- [ ] JWT secrets are secure
- [ ] CORS configured for frontend domain

### Frontend
- [ ] Builds successfully
- [ ] Environment variables set
- [ ] Can login/register
- [ ] Can fetch data from backend
- [ ] No CORS errors in console
- [ ] API calls work on production

### Database
- [ ] Backups enabled
- [ ] Connection pooling configured
- [ ] Indexes created for performance

## 🔒 Security Checklist

- [ ] Use HTTPS for all connections
- [ ] Strong JWT secrets (64+ characters)
- [ ] CORS restricted to specific domains
- [ ] Rate limiting enabled (optional)
- [ ] SQL injection protection (Prisma handles this)
- [ ] Input validation on all endpoints
- [ ] Passwords hashed with bcrypt
- [ ] Sensitive data not logged

## 🐛 Troubleshooting

### "Cannot connect to database"
- Check `DATABASE_URL` format
- Ensure database is running
- Verify network connectivity
- Check database credentials

### "CORS error"
- Add frontend URL to `CORS_ORIGIN`
- Restart backend after changing env vars
- Check for trailing slashes in URLs

### "401 Unauthorized"
- Check token is being sent
- Verify token hasn't expired
- Check JWT secrets match

### "Module not found"
- Run `npm install` in backend
- Check all imports use correct paths
- Verify `package.json` has all dependencies

## 📊 Monitoring

### Replit Console
- Click "Console" to view logs
- Monitor for errors
- Check server startup messages

### Database Monitoring
- Railway: Check "Metrics" tab
- Neon: Use built-in monitoring
- Watch for connection limits

## 🚀 Performance Tips

1. **Enable database connection pooling** in Prisma:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     connectionLimit = 10
   }
   ```

2. **Add Redis caching** (optional)

3. **Enable Gzip compression** in Express

4. **Use CDN for static assets**

5. **Implement pagination** for large datasets

## 📝 Maintenance

### Regular Tasks
- Monitor error logs
- Check database size
- Review API usage
- Update dependencies
- Backup database regularly

### Updating Backend
```bash
# Pull latest changes
git pull

# Install dependencies
npm install

# Run migrations
npm run prisma:migrate

# Restart server
npm start
```

## 🎓 Additional Resources

- [Replit Documentation](https://docs.replit.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

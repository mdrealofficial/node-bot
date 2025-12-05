# 🚀 Quick Start Guide

Get your Node.js backend up and running in 5 minutes!

## ⚡ Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- Terminal/Command Line

## 📦 Step 1: Install Backend Dependencies

```bash
cd backend
npm install
```

## 🔧 Step 2: Setup Environment

```bash
cp .env.example .env
```

Edit `.env` file:

```env
# Required: PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Required: JWT secrets (generate random strings)
JWT_ACCESS_SECRET=your-super-secret-access-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# Required: Frontend URL for CORS
CORS_ORIGIN=http://localhost:5173

# Optional
PORT=3001
NODE_ENV=development
```

**Generate secure secrets:**
```bash
# Run this twice to generate two different secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🗄️ Step 3: Setup Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Create database tables
npm run prisma:migrate

# Optional: Open Prisma Studio to view database
npm run prisma:studio
```

## 🏃 Step 4: Start Backend Server

```bash
npm run dev
```

You should see:
```
╔════════════════════════════════════════╗
║   🚀 Lovable Backend Server Started   ║
╚════════════════════════════════════════╝
  
  Environment: development
  Port:        3001
  API:         http://localhost:3001/api
  Health:      http://localhost:3001/health
```

## ✅ Step 5: Test Backend

Open browser or use curl:

```bash
# Test health endpoint
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"2024-...","uptime":123.456}

# Test registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin1234!",
    "fullName": "Admin User"
  }'

# Expected response:
# {"success":true,"message":"User registered successfully","data":{...}}
```

## 📱 Step 6: Setup Frontend

```bash
# In your project root (not backend folder)
cd ..

# Install axios
npm install axios

# Add environment variable
echo 'VITE_API_URL=http://localhost:3001/api' >> .env
```

The API client and services are already created in:
- `src/lib/apiClient.ts`
- `src/services/api.ts`

## 🎯 Step 7: Update AuthContext

Replace your `src/contexts/AuthContext.tsx` with the new implementation from `FRONTEND_INTEGRATION.md`.

Key changes:
```typescript
// Before (Supabase)
import { supabase } from '@/integrations/supabase/client';
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

// After (Custom Backend)
import { authService } from '@/services/api';
const { data } = await authService.login(email, password);
localStorage.setItem('accessToken', data.data.accessToken);
```

## 🔄 Step 8: Start Frontend

```bash
npm run dev
```

## 🧪 Quick Test Checklist

Open your app and test:

- [ ] Can register new account
- [ ] Can login with email/password
- [ ] Can view products
- [ ] Can create/edit products
- [ ] No errors in browser console
- [ ] API calls appear in Network tab

## 📊 Common Issues

### "Cannot connect to database"
- Check PostgreSQL is running
- Verify `DATABASE_URL` is correct
- Test connection: `psql $DATABASE_URL`

### "CORS error in browser"
- Add your frontend URL to `CORS_ORIGIN` in backend `.env`
- Restart backend server after changing `.env`

### "401 Unauthorized"
- Check token is being saved to localStorage
- Verify `Authorization: Bearer <token>` header is sent
- Check token hasn't expired

### "Module not found"
- Run `npm install` in backend folder
- Check all files are in correct locations

## 🌐 Next: Deploy to Production

Once local testing works:

1. **Deploy Database**: Railway, Neon, or Supabase (DB only)
2. **Deploy Backend**: Replit (see `DEPLOYMENT_GUIDE.md`)
3. **Update Frontend**: Change `VITE_API_URL` to production URL
4. **Deploy Frontend**: Vercel or Netlify

## 📚 Full Documentation

- **API Endpoints**: See `backend/README.md`
- **Frontend Integration**: See `FRONTEND_INTEGRATION.md`
- **Deployment**: See `DEPLOYMENT_GUIDE.md`
- **Migration Details**: See `MIGRATION_SUMMARY.md`

## 💡 Pro Tips

**Use Prisma Studio** for database GUI:
```bash
cd backend
npm run prisma:studio
# Opens at http://localhost:5555
```

**View logs** in real-time:
```bash
# Backend will log all requests in development mode
```

**Test endpoints** with tools:
- Postman
- Insomnia  
- Thunder Client (VS Code extension)
- curl

**Database management**:
```bash
# Create new migration
npm run prisma:migrate

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# View database
npm run prisma:studio
```

## 🆘 Need Help?

1. Check the error message carefully
2. Review relevant documentation file
3. Verify all environment variables are set
4. Check database connection
5. Ensure all dependencies installed

---

**Status**: Ready to code! 🎉

Your backend is running and ready to replace Supabase. Start by testing the API endpoints and gradually migrate your frontend code.

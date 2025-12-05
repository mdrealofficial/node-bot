# 🚀 Deploy Backend to Replit

Complete guide to deploy your Node.js backend on Replit with PostgreSQL database.

---

## 📋 Prerequisites

- GitHub account (you already have the repo!)
- Replit account (free) - Sign up at https://replit.com

---

## 🔧 Step-by-Step Deployment

### 1. Import from GitHub

1. Go to https://replit.com
2. Click **"Create Repl"**
3. Select **"Import from GitHub"**
4. Paste your repository URL: `https://github.com/mdrealofficial/node-bot`
5. Click **"Import from GitHub"**

### 2. Configure Replit

Replit will automatically detect it's a Node.js project. If not:

1. In the Replit editor, ensure `.replit` file exists (it's already in your repo)
2. The run command should be: `npm start`
3. Entry point: `backend/src/server.js`

### 3. Set Up PostgreSQL Database

**Replit provides FREE PostgreSQL!**

1. Click the **"Tools"** icon (🔧) in left sidebar
2. Select **"Database"**
3. Click **"Add PostgreSQL Database"**
4. Replit will automatically:
   - Create a PostgreSQL instance
   - Set `DATABASE_URL` environment variable

### 4. Configure Environment Variables

Click **"Secrets"** (🔒 icon) in left sidebar and add:

```bash
# DATABASE_URL is auto-set by Replit PostgreSQL, but verify it exists
DATABASE_URL=postgresql://... (auto-filled by Replit)

# Server
PORT=3000
NODE_ENV=production

# JWT Secrets - CHANGE THESE!
JWT_ACCESS_SECRET=your-random-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-different-random-secret-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS - Add your frontend URL
CORS_ORIGIN=https://your-vercel-app.vercel.app,http://localhost:5173
```

**Generate secure JWT secrets:**
```bash
# Run these in Replit Shell to generate random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Install Dependencies & Run Migrations

Open **Shell** in Replit and run:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm start
```

### 6. Verify Deployment

Your backend will be live at: `https://your-repl-name.your-username.repl.co`

Test the API:
```bash
curl https://your-repl-name.your-username.repl.co/health
```

Expected response:
```json
{
  "status": "success",
  "message": "Server is running",
  "timestamp": "2025-12-06T..."
}
```

---

## 🔄 Update Frontend to Use Replit Backend

After backend is deployed, update your frontend:

### Update `src/lib/apiClient.ts`

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-repl-name.your-username.repl.co/api';
```

### Set Environment Variable in Vercel (Frontend)

When deploying frontend to Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - Name: `VITE_API_URL`
   - Value: `https://your-repl-name.your-username.repl.co/api`
3. Click **Save**
4. Redeploy frontend

---

## 🎯 Important Replit Settings

### Keep Repl Always On (Free Tier Limitation)

**Free tier Repls sleep after inactivity.** Options:

1. **UptimeRobot** (Free): Ping your Repl every 5 minutes
   - Sign up at https://uptimerobot.com
   - Add monitor: `https://your-repl-name.your-username.repl.co/health`
   - Interval: 5 minutes

2. **Replit Hacker Plan** ($7/month):
   - Always-on Repls
   - Faster performance
   - More resources

### Configure CORS Properly

Make sure your Replit backend URL is added to frontend CORS:

In backend `.env` (Replit Secrets):
```
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

---

## 📊 Database Management

### Access PostgreSQL Database

In Replit Shell:
```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# List tables
\dt

# View users
SELECT * FROM "User" LIMIT 10;

# Exit
\q
```

### Prisma Studio (Database GUI)

```bash
cd backend
npx prisma studio
```

Click the URL shown to access Prisma Studio in browser.

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'prisma/client'"

**Solution:**
```bash
cd backend
npx prisma generate
npm start
```

### Issue: "DATABASE_URL environment variable not set"

**Solution:**
1. Go to Secrets (🔒)
2. Verify `DATABASE_URL` exists
3. If not, add PostgreSQL database via Tools → Database

### Issue: "Port 3000 already in use"

**Solution:**
Replit automatically assigns ports. Use:
```javascript
const PORT = process.env.PORT || 3000;
```
(Already configured in your `server.js`)

### Issue: CORS errors from frontend

**Solution:**
Update backend CORS_ORIGIN in Secrets:
```
CORS_ORIGIN=https://your-actual-frontend-url.vercel.app
```

### Issue: Migrations fail

**Solution:**
```bash
cd backend
npx prisma migrate reset
npx prisma migrate deploy
```

---

## 🔐 Security Checklist

- ✅ Change JWT secrets to random 32+ character strings
- ✅ Set NODE_ENV=production
- ✅ Add only your frontend URL to CORS_ORIGIN
- ✅ Never commit `.env` file (use Replit Secrets)
- ✅ Enable rate limiting (already configured)
- ✅ Keep dependencies updated

---

## 📈 Monitoring

### View Logs

In Replit:
- Console tab shows real-time logs
- Check for errors on startup

### Test All Endpoints

```bash
# Health check
curl https://your-repl.repl.co/health

# Register user
curl -X POST https://your-repl.repl.co/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Login
curl -X POST https://your-repl.repl.co/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

---

## 🚀 Next Steps

1. ✅ Deploy backend to Replit
2. ✅ Test all API endpoints
3. Update frontend `VITE_API_URL` environment variable
4. Deploy frontend to Vercel
5. Test complete application flow
6. Set up UptimeRobot to keep Repl awake

---

## 📞 Support

- **Replit Docs**: https://docs.replit.com
- **Replit Community**: https://ask.replit.com
- **Your Deployment Guide**: See `docs/guides/deployment/DEPLOYMENT_GUIDE.md`

---

**Your Replit backend will be live at**: `https://[your-repl-name].[your-username].repl.co`

**Remember to add this URL to your frontend environment variables!**

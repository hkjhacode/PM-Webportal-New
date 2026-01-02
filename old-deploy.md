# 🚀 Deployment Guide - Quick Steps

## Your Code is Ready on GitHub! ✅
**Repository**: https://github.com/hkjhacode/PM-Webportal-New

---

## Step 1: MongoDB Atlas Setup (15 mins)

MongoDB Atlas page is already open in your browser! Follow these steps:

### 1.1 Sign Up/Login
- Use **Google** or **GitHub** sign-in (fastest)
- Answer setup questions (select "Building a new app")

### 1.2 Create FREE Database
1. Click **"Create Deployment"** or **"Build a Database"**
2. **Select M0 FREE** (512 MB - perfect for your app)
3. Choose **AWS** provider, **Mumbai** region
4. Name: `visitwise-cluster`
5. Click **"Create"**
6. **SAVE the username/password** shown!

### 1.3 Database User
1. **Security → Database Access** (left menu)
2. **Add New Database User**
3. Username: `visitwise-admin`
4. **Autogenerate password** → **SAVE IT!**
5. Privileges: **"Read and write to any database"**
6. Click **"Add User"**

### 1.4 Network Access
1. **Security → Network Access** (left menu)
2. **Add IP Address**
3. **"Allow Access from Anywhere"** (0.0.0.0/0)
4. Click **"Confirm"**

### 1.5 Get Connection String
1. **Database** → Click **"Connect"**
2. Select **"Drivers"** → Choose **"Node.js"**
3. **Copy connection string**:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/
   ```
4. **Replace `<password>`** with your actual password
5. **Add `/visitwise?retryWrites=true&w=majority` at the end**:
   ```
   mongodb+srv://user:pass@cluster.mongodb.net/visitwise?retryWrites=true&w=majority
   ```
6. **SAVE THIS!** You need it for Vercel.

---

## Step 2: Deploy to Vercel (10 mins)

### 2.1 Open Vercel
Visit: **https://vercel.com/signup**
- Click **"Continue with GitHub"**
- Authorize Vercel

### 2.2 Import Project
1. Click **"Add New..." → "Project"**
2. Find: **`hkjhacode/PM-Webportal-New`**
3. Click **"Import"**

### 2.3 Configure (Auto-detected ✅)
- Framework: Next.js
- Build: `next build`
- Keep all defaults

### 2.4 Environment Variables ⚠️ IMPORTANT!

**Before clicking Deploy**, add these variables:

**Variable 1:**
```
Name: MONGODB_URI
Value: [paste your MongoDB connection string from Step 1.5]
```

**Variable 2 - Generate JWT Secret:**

Open PowerShell and run:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output, then add:
```
Name: JWT_SECRET
Value: [paste the generated string]
```

Make sure both are set to **"Production"** environment.

### 2.5 Deploy
1. Click **"Deploy"**
2. Wait 2-5 minutes
3. **Copy your URL**: `https://your-app.vercel.app`

### 2.6 Update App URL
1. **Settings → Environment Variables**
2. Add:
   ```
   Name: NEXT_PUBLIC_APP_URL
   Value: [your Vercel URL]
   ```
3. **Deployments** tab → Click **"Redeploy"**

---

## Step 3: Seed Database (5 mins)

### 3.1 Create/Edit `.env.local`
In your project folder, create `.env.local`:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/visitwise?retryWrites=true&w=majority
```

### 3.2 Seed Production DB
Run in terminal:
```powershell
node src/lib/seedPMOUser.js
```

Should see: "✅ PMO user created"

### 3.3 Revert .env.local
Change back to:
```
MONGODB_URI=mongodb://localhost:27017/visitwise
```

---

## Step 4: Test Deployment (5 mins)

### Visit Your App
Go to: `https://your-app.vercel.app`

### Check Health
Visit: `https://your-app.vercel.app/api/health`

Should show:
```json
{"status": "ok", "mongodb": {"connected": true}}
```

### Login
- Username: `pmo_user`
- Password: `pmo@12345`

---

## 🎉 Done!

Your app is now live and deployed!

**Need help?** Let me know which step you're on and I'll assist.

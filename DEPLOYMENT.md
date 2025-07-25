# 🚀 Tukkan Deployment Guide - Railway

This guide will help you deploy your Tukkan business management application to Railway.

## 📋 Prerequisites

1. **GitHub Account** - Your code needs to be in a GitHub repository
2. **Railway Account** - Sign up at [railway.app](https://railway.app)
3. **Built Application** - Run the build script first

## 🏗️ Step 1: Prepare for Deployment

### Build the Application
```bash
# Run the build script
python build.py

# Or manually:
npm install
npm run build
```

### Push to GitHub
```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial deployment setup"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/tukkan.git

# Push to GitHub
git push -u origin main
```

## 🚂 Step 2: Deploy to Railway

### Option A: Deploy via GitHub (Recommended)

1. **Go to Railway**: Visit [railway.app](https://railway.app)
2. **Sign Up/Login**: Use your GitHub account
3. **Create New Project**: Click "New Project"
4. **Deploy from GitHub**: Select "Deploy from GitHub repo"
5. **Select Repository**: Choose your `tukkan` repository
6. **Configure Environment Variables**:
   - Click on your deployed service
   - Go to "Variables" tab
   - Add these variables:
     ```
     PORT=8080
     FLASK_ENV=production
     VITE_API_URL=https://YOUR_APP_NAME.up.railway.app
     ```
   - Replace `YOUR_APP_NAME` with your actual Railway app URL

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

## 🔧 Step 3: Configuration

### Environment Variables
Set these in Railway dashboard under Variables:

```env
PORT=8080
FLASK_ENV=production
VITE_API_URL=https://your-app-name.up.railway.app
```

### Custom Domain (Optional)
1. Go to your Railway project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## 📱 Step 4: Access Your Application

Your app will be available at:
- **Railway URL**: `https://your-app-name.up.railway.app`
- **Custom Domain**: `https://your-domain.com` (if configured)

### Default Login Credentials
- **Username**: `Oh No!`
- **Password**: `temmuz31201`
- **Role**: Yönetici (Manager)

## 🗄️ Database

- **SQLite database** will be automatically created on first run
- **Data persistence** is handled by Railway's volume storage
- **Automatic backups** are included in Railway's infrastructure

## 🔄 Updates and Maintenance

### Automatic Deployments
- Railway automatically redeploys when you push to your GitHub repository
- No manual intervention needed for updates

### Manual Redeploy
```bash
# Using Railway CLI
railway redeploy

# Or use the Railway dashboard:
# Go to project → Deployments → Click "Redeploy"
```

### Database Backup
1. Download database via Railway dashboard
2. Or use Railway CLI: `railway shell` and copy the SQLite file

## 🚨 Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Check build logs in Railway dashboard
# Ensure all dependencies are in package.json and requirements.txt
```

**Database Issues:**
```bash
# Check if database path is correct in backend/app.py
# Verify SQLite file permissions
```

**CORS Errors:**
```bash
# Verify VITE_API_URL matches your Railway app URL
# Check Flask CORS configuration
```

**Static Files Not Loading:**
```bash
# Ensure `npm run build` completed successfully
# Check if dist/ directory exists and contains files
# Verify Flask static file routes
```

### Logs and Debugging
```bash
# View logs via Railway CLI
railway logs

# Or check in Railway dashboard:
# Project → Deployments → View Logs
```

## 📊 Monitoring

Railway provides built-in monitoring:
- **CPU & Memory usage**
- **Request metrics**
- **Error tracking**
- **Uptime monitoring**

## 💰 Pricing

- **Free Tier**: $5 credit per month (sufficient for small businesses)
- **Pro Plan**: $20/month (recommended for production)
- **Usage-based pricing** after free credits

## 🛡️ Security

### Production Security Checklist:
- [ ] Change default admin password
- [ ] Set up user accounts with appropriate roles
- [ ] Enable HTTPS (automatic with Railway)
- [ ] Regular database backups
- [ ] Monitor access logs

## 📞 Support

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: Community support
- **GitHub Issues**: For application-specific problems

---

## 🎉 Congratulations!

Your Tukkan business management system is now live and accessible from anywhere with an internet connection!

### What's Next?
1. **Test all features** in production environment
2. **Create user accounts** for your team
3. **Import existing data** if needed
4. **Set up regular backups**
5. **Monitor usage and performance**

Your private business management system is ready to use! 🚀 
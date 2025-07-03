# 🚀 Deploy Asset Survey to Render

This guide will help you deploy your Asset Survey application to Render with HTTPS support.

## 📋 Prerequisites

1. **GitHub Account** - Your code needs to be in a GitHub repository
2. **Render Account** - Sign up at [render.com](https://render.com)
3. **Supabase Project** - Set up your database (optional but recommended)

## 🔧 Step-by-Step Deployment

### 1. Prepare Your Repository

First, make sure your code is pushed to GitHub:

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit - Asset Survey App"

# Add your GitHub repository as origin
git remote add origin https://github.com/yourusername/asset-survey-app.git

# Push to GitHub
git push -u origin main
```

### 2. Deploy to Render

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**

   - **Name:** `asset-survey-app`
   - **Environment:** `Node`
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm run preview`

### 3. Configure Environment Variables

In the Render dashboard, add these environment variables:

#### Required Variables:
```
NODE_ENV=production
```

#### Optional (for database functionality):
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Custom Domain (Optional)

To use your own domain:

1. Go to your service settings in Render
2. Click "Custom Domains"
3. Add your domain (e.g., `asset-survey.yourdomain.com`)
4. Update your DNS records as instructed
5. Render will automatically provision SSL certificates

## 🌐 Access Your Live App

After deployment (usually 5-10 minutes):

- **Render URL:** `https://asset-survey-app.onrender.com`
- **Custom Domain:** `https://yourdomain.com` (if configured)

## 🔒 HTTPS & Security

✅ **Automatic HTTPS** - Render provides free SSL certificates
✅ **Security Headers** - Automatically configured
✅ **CDN** - Global content delivery included

## 📊 Features Available

### Without Database:
- ✅ Interactive map with Thailand focus
- ✅ Drawing tools (points, lines, polygons)
- ✅ GeoJSON layer upload/export
- ✅ Measurement tools
- ✅ Location services
- ✅ Responsive design

### With Supabase Database:
- ✅ All above features PLUS:
- ✅ User authentication
- ✅ Project management
- ✅ Asset persistence
- ✅ Admin dashboard
- ✅ Role-based access control

## 🛠 Troubleshooting

### Build Fails
```bash
# Check your build locally first
npm ci
npm run build
npm run preview
```

### Environment Variables Not Working
- Ensure variables start with `VITE_` for client-side access
- Check spelling and values in Render dashboard
- Redeploy after adding variables

### Database Connection Issues
- Verify Supabase URL and key are correct
- Check Supabase project is active
- Ensure RLS policies are properly configured

## 🔄 Automatic Deployments

Render automatically deploys when you push to your main branch:

```bash
# Make changes to your code
git add .
git commit -m "Update feature"
git push origin main
# Render will automatically deploy the changes
```

## 📈 Monitoring & Logs

- **View Logs:** Render Dashboard → Your Service → Logs
- **Monitor Performance:** Built-in metrics available
- **Health Checks:** Automatic monitoring included

## 💰 Pricing

- **Free Tier:** Perfect for testing and small projects
- **Paid Plans:** For production apps with custom domains
- **No Hidden Costs:** Transparent pricing

## 🎯 Production Checklist

- [ ] Code pushed to GitHub
- [ ] Render service configured
- [ ] Environment variables set
- [ ] Build successful
- [ ] App accessible via HTTPS
- [ ] Database connected (if using Supabase)
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active

## 🚀 Next Steps

1. **Share your live app:** `https://your-app.onrender.com`
2. **Set up monitoring:** Configure alerts in Render
3. **Add custom domain:** For professional branding
4. **Scale as needed:** Upgrade plans for more resources

Your Asset Survey application is now live with HTTPS! 🎉
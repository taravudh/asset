# Deploying Asset Survey Mapping to Render

This guide explains how to deploy your Asset Survey Mapping application to Render.

## Prerequisites

1. A [Render account](https://render.com/signup)
2. Your project code in a GitHub repository

## Deployment Steps

### 1. Push Your Code to GitHub

If you haven't already, push your code to a GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/asset-survey-app.git
git push -u origin main
```

### 2. Create a New Web Service on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com/)
2. Click **New** and select **Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `asset-survey-app` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview`
   - **Plan**: Free (or select a paid plan for production use)

### 3. Configure Environment Variables

Add the following environment variables in the Render dashboard:

- `NODE_ENV`: `production`
- `PORT`: `10000`

If you're using Supabase, also add:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### 4. Deploy

Click **Create Web Service** to deploy your application.

Render will automatically:
1. Clone your repository
2. Install dependencies
3. Build your application
4. Start the server

## Accessing Your Deployed Application

Once deployed, your application will be available at:
```
https://asset-survey-app.onrender.com
```

Or at your custom domain if you've configured one.

## Features Available in Deployed Version

- ✅ Interactive map with drawing tools
- ✅ Project management system
- ✅ Asset creation and management
- ✅ Layer management
- ✅ Photo capture and storage
- ✅ GeoJSON import/export
- ✅ User authentication (if using Supabase)
- ✅ Responsive design for mobile and desktop

## Troubleshooting

### Build Fails
- Check the build logs in the Render dashboard
- Ensure all dependencies are correctly listed in package.json
- Verify that your build command works locally

### Application Crashes
- Check the logs in the Render dashboard
- Ensure your start command is correct
- Verify that all required environment variables are set

### Database Connection Issues
- Verify your Supabase URL and key are correct
- Ensure your Supabase project is active
- Check that your RLS policies are properly configured

## Updating Your Deployment

Render automatically deploys when you push to your GitHub repository. To update your application:

1. Make changes to your code
2. Commit and push to GitHub
3. Render will automatically rebuild and deploy

## Custom Domain (Optional)

To use a custom domain:

1. Go to your web service in the Render dashboard
2. Click on **Settings**
3. Scroll to the **Custom Domain** section
4. Click **Add Custom Domain**
5. Follow the instructions to configure your DNS settings

## Support

If you encounter any issues with your Render deployment, check the [Render documentation](https://render.com/docs) or contact Render support.
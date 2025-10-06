# Railway Deployment Guide

This guide will help you deploy your Employee Management System to Railway.app with a PostgreSQL database.

## Prerequisites
- A Railway.app account (sign up at https://railway.app)
- Git installed on your machine
- Your code pushed to a GitHub repository

## Step 1: Create a New Project on Railway

1. Go to https://railway.app and log in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if you haven't already
5. Select the repository containing your Employee Management System

## Step 2: Add PostgreSQL Database

1. In your Railway project, click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically create a PostgreSQL database
3. The database will be automatically connected to your application

## Step 3: Configure Environment Variables

Railway automatically sets the `DATABASE_URL` environment variable when you add PostgreSQL. You can verify this:

1. Click on your PostgreSQL service
2. Go to the "Variables" tab
3. You should see `DATABASE_URL` is already set

The app will automatically use the PORT variable that Railway provides.

## Step 4: Deploy Your Application

1. Railway will automatically detect your Node.js application
2. It will run `npm install` to install dependencies
3. It will use `npm start` to run your application (as defined in package.json)

Your application should now be deploying!

## Step 5: Access Your Application

1. Once deployment is complete, Railway will provide a URL
2. Click on your application service
3. Go to "Settings" → "Networking" 
4. Click "Generate Domain" to get a public URL
5. Your Employee Management System is now live!

## Environment Variables

Your application requires the following environment variable:

- `DATABASE_URL` - PostgreSQL connection string (automatically set by Railway when you add the database)
- `PORT` - Application port (automatically set by Railway)

## Deployment Commands

Railway uses these commands from your `package.json`:

```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

## Troubleshooting

### Database Connection Issues
- Ensure the PostgreSQL service is running in Railway
- Check that DATABASE_URL is set in your environment variables
- Review the deployment logs for connection errors

### Application Not Starting
- Check the logs in Railway dashboard
- Verify that all dependencies are listed in package.json
- Ensure Node.js version is compatible (Railway uses latest LTS by default)

### Port Issues
- Railway automatically assigns a PORT environment variable
- Your app is already configured to use `process.env.PORT || 5000`

## Cost Information

Railway offers:
- $5 free credits per month for new users
- Pay-as-you-go pricing after free credits
- PostgreSQL database included in usage

## Additional Resources

- Railway Documentation: https://docs.railway.app
- Railway Discord Community: https://discord.gg/railway
- PostgreSQL on Railway: https://docs.railway.app/databases/postgresql

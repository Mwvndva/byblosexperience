# Deployment Guide

This guide explains how to deploy the Byblos Atelier backend to Render.

## Prerequisites

1. A Render.com account
2. A GitHub account with access to this repository
3. A PostgreSQL database (can be created on Render)

## Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```env
# Server Configuration
NODE_ENV=production
PORT=10000

# Database Configuration
DATABASE_URL=your-render-database-url

# JWT Configuration
JWT_SECRET=generate-a-secure-secret
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90

# Email Configuration
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USERNAME=your-zoho-email
EMAIL_PASSWORD=your-zoho-app-password
EMAIL_FROM_NAME=Byblos Experience
EMAIL_FROM_EMAIL=your-email@example.com
SUPPORT_EMAIL=support@byblos.com

# Application Configuration
APP_NAME=Byblos Atelier
CORS_ORIGIN=your-frontend-url
FRONTEND_URL=your-frontend-url
```

## Deployment Steps

1. **Set up the database on Render**:
   - Go to Render Dashboard
   - Click "New" → "PostgreSQL"
   - Name: `byblos-db`
   - Database: `byblos_atelier`
   - User: `byblos_user`
   - Select a region
   - Click "Create Database"
   - Note the "Internal Database URL"

2. **Deploy the backend**:
   - Go to Render Dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the repository and branch
   - Configure the service:
     - Name: `byblos-backend`
     - Region: Same as your database
     - Branch: `main` (or your deployment branch)
     - Build Command: `npm install`
     - Start Command: `npm run migrate && npm start`
   - Add all environment variables from the `.env` file
   - Click "Create Web Service"

3. **Update Frontend Configuration**:
   - Update your frontend's `.env` file with the backend URL:
     ```
     VITE_API_URL=https://byblos-backend.onrender.com/api
     ```

## Post-Deployment

1. **Verify the deployment**:
   - Visit `https://byblos-backend.onrender.com/api/health`
   - You should see a success message

2. **Run database migrations** (if not already run):
   - You can run migrations manually from the Render dashboard's "Shell" tab:
     ```bash
     npm run migrate
     ```

## Troubleshooting

- **Build Failures**: Check the build logs in the Render dashboard
- **Database Connection Issues**: Verify the DATABASE_URL is correct
- **Application Crashes**: Check the application logs for errors

## SSL Configuration

Render provides automatic SSL certificates through Let's Encrypt. No additional configuration is needed.

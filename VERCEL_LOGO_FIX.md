# Vercel Logo Loading Fix

## Problem
Logo loads fine on localhost but not on Vercel deployment.

## Root Cause
Vercel's routing configuration was catching all requests (`/(.*)`) and redirecting them to `index.html`, including static files like `logo.jpeg`.

## Solution Applied
Updated `vercel.json` to explicitly route static files before the catch-all route:

```json
{
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": {
        "cache-control": "s-maxage=31536000,immutable"
      }
    },
    {
      "src": "/logo.jpeg",
      "dest": "/logo.jpeg"
    },
    {
      "src": "/favicon.ico", 
      "dest": "/favicon.ico"
    },
    {
      "src": "/manifest.json",
      "dest": "/manifest.json"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## Why This Works
- Static files (`logo.jpeg`, `favicon.ico`, `manifest.json`) are served directly
- Only unmatched routes fall through to the SPA routing (`index.html`)
- Order matters - specific routes must come before the catch-all

## Deploy the Fix
```bash
git add vercel.json
git commit -m "Fix Vercel static file routing for logo and assets"
git push origin main
```

Vercel will automatically redeploy with the fix.

## Test After Deployment
1. Visit your Vercel URL
2. Check if logo appears on login page
3. Test direct access: `https://your-app.vercel.app/logo.jpeg`
4. Should return the image file (not HTML)

## Alternative Solutions (if above doesn't work)

### Option 1: Move logo to static folder
```bash
mkdir -p public/static
mv public/logo.jpeg public/static/logo.jpeg
```
Then update references to `/static/logo.jpeg`

### Option 2: Use base64 inline image
Convert logo to base64 and embed directly in CSS:
```css
.logo {
  background-image: url('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...');
}
```

### Option 3: Use CDN
Upload logo to a CDN (Cloudinary, Firebase Storage) and reference the CDN URL.

## Verification
After deployment, the logo should load on:
- Login page
- Create account page
- Password reset page
- Dashboard footer
- All other pages that reference `/logo.jpeg`


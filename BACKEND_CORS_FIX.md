# Backend CORS Fix

## Problem

The console showed this error:
```
Access to fetch at 'https://intake.theholylabs.com/api/patients/CASE-MGXFRXIM-LSZ21' from origin 'https://socio-sync-sepia.vercel.app' has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header contains multiple values 'https://socio-sync-sepia.vercel.app, https://sociosync.theholylabs.com', but only one is allowed.
```

## Root Cause

**Duplicate CORS headers** were being added by both:
1. **Flask-CORS** in `medical-one/fileserver/app.py` (line 17): `CORS(app, resources={r"/*": {"origins": "*"}})`
2. **nginx** in `medical-one/nginx.conf` (lines 52-55): Adding `Access-Control-Allow-Origin` headers

This caused the browser to receive multiple `Access-Control-Allow-Origin` headers, which is not allowed.

## Solution

**Disabled nginx CORS headers** and let Flask-CORS handle all CORS logic, since it's already configured to allow all origins (`"*"`).

### Changes Made

#### `medical-one/nginx.conf`
- **Commented out** all CORS header additions in nginx
- Added explanatory comments about the duplicate header issue
- Kept the OPTIONS preflight handler

```nginx
# CORS headers for Vercel frontend (dynamic origin handling)
# Note: Flask-CORS is already configured with origins: "*" in app.py
# To avoid duplicate headers, we'll let Flask handle CORS
# If you need nginx-level CORS, uncomment the lines below and remove Flask-CORS
# add_header Access-Control-Allow-Origin "https://socio-sync-sepia.vercel.app" always;
# add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
# add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
# add_header Access-Control-Allow-Credentials "true" always;
```

## How to Apply

### On the Backend Server:

1. **Update nginx configuration:**
   ```bash
   cd /path/to/medical-one
   # Copy the updated nginx.conf to the server
   ```

2. **Restart nginx container:**
   ```bash
   docker-compose restart nginx
   ```

3. **Verify the fix:**
   ```bash
   # Check nginx logs
   docker-compose logs nginx
   
   # Test a patient API call
   curl -I https://intake.theholylabs.com/api/patients/CASE-MGXFRXIM-LSZ21
   ```

## Alternative Solution (If Needed)

If you prefer nginx-level CORS control instead of Flask-CORS:

1. **Remove Flask-CORS from `app.py`:**
   ```python
   # Comment out or remove line 17
   # CORS(app, resources={r"/*": {"origins": "*"}})
   ```

2. **Uncomment nginx CORS headers:**
   ```nginx
   add_header Access-Control-Allow-Origin "https://socio-sync-sepia.vercel.app" always;
   add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
   add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
   add_header Access-Control-Allow-Credentials "true" always;
   ```

3. **Restart both containers:**
   ```bash
   docker-compose restart nginx fileserver
   ```

## Expected Result

After applying the fix, API calls from `https://socio-sync-sepia.vercel.app` to `https://intake.theholylabs.com` should work without CORS errors.

## Verification

Check the browser console - the CORS error should be gone:
- ✅ Patient data loads successfully
- ✅ Images from `intake.theholylabs.com` display correctly
- ✅ No duplicate `Access-Control-Allow-Origin` headers

---

**Date**: October 19, 2025  
**Status**: Ready to deploy


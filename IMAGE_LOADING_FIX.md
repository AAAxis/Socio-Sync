# Image Loading Issue - External Server CORS

## Problem

Images stored on external servers (like `https://intake.theholylabs.com`) may not load due to CORS (Cross-Origin Resource Sharing) restrictions.

## Why This Happens

When your app is deployed on Vercel (e.g., `your-app.vercel.app`) and tries to load images from a different domain (e.g., `intake.theholylabs.com`), browsers block the request unless the image server explicitly allows it via CORS headers.

## Solutions

### Option 1: Configure CORS on Backend Server (Recommended)

Add CORS headers to your backend API server:

**For Node.js/Express:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-app.vercel.app',
    // Add all your deployed URLs
  ],
  credentials: true
}));

// For serving images specifically
app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));
```

**For Nginx:**
```nginx
location /uploads {
    add_header Access-Control-Allow-Origin *;
    add_header Cross-Origin-Resource-Policy cross-origin;
}
```

### Option 2: Use Image Component with Error Handling

Already implemented in the code - images that fail to load will show a file icon instead.

### Option 3: Store Images in Cloud Storage

Use a service that handles CORS automatically:

#### Firebase Storage
```typescript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storage = getStorage();

// Upload
const storageRef = ref(storage, `patients/${caseId}/${file.name}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);

// URL will work without CORS issues
```

#### Cloudinary
```typescript
// Free tier, automatic CORS handling
const cloudinaryUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'your_preset');
  
  const response = await fetch(
    'https://api.cloudinary.com/v1_1/your_cloud_name/image/upload',
    {
      method: 'POST',
      body: formData
    }
  );
  
  const data = await response.json();
  return data.secure_url; // CORS-friendly URL
};
```

### Option 4: Proxy Images Through Your App

Create an API route in your backend that proxies images:

```javascript
// Backend API route
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  
  try {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    
    res.set('Content-Type', response.headers.get('content-type'));
    res.set('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).send('Error loading image');
  }
});
```

Then use it in your app:
```typescript
// Instead of direct URL
<img src="https://external-server.com/image.jpg" />

// Use proxy
<img src={`${API_URL}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`} />
```

## Quick Test

Check if CORS is the issue:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors like:
   - "CORS policy: No 'Access-Control-Allow-Origin' header"
   - "Cross-Origin Request Blocked"

If you see these, CORS is the problem.

## Current Implementation Status

The app currently:
- ✅ Loads images directly from external URLs
- ✅ Shows file icon fallback for non-images
- ❌ No error handling for failed image loads
- ❌ No CORS headers configured on backend

## Recommended Action

1. **Short-term**: Add error handling to show placeholder for failed images
2. **Long-term**: Configure CORS on backend OR migrate to Firebase Storage

## Implementation

I'll add error handling to the image component now...


# Backend CORS Configuration for Images

## Problem

Your backend API at `https://intake.theholylabs.com` may not have CORS headers configured, which prevents images from loading in the browser.

## Contact Backend Team

If you control the backend server, ask them to add these headers:

### For All Image/File Responses

```
Access-Control-Allow-Origin: *
Cross-Origin-Resource-Policy: cross-origin
```

### Node.js/Express Example

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-vercel-app.vercel.app',
    // Add all your frontend URLs
  ],
  credentials: true
}));

// Serve static files with CORS headers
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

// Or for specific image routes
app.get('/api/images/:filename', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.sendFile(path.join(__dirname, 'uploads', req.params.filename));
});
```

### Nginx Example

```nginx
server {
    location /uploads/ {
        add_header Access-Control-Allow-Origin *;
        add_header Cross-Origin-Resource-Policy cross-origin;
        add_header Cache-Control "public, max-age=31536000";
    }
    
    location /api/images/ {
        add_header Access-Control-Allow-Origin *;
        add_header Cross-Origin-Resource-Policy cross-origin;
    }
}
```

## Test CORS Configuration

After backend is updated, test with:

```bash
curl -I https://intake.theholylabs.com/path/to/image.jpg
```

You should see:
```
Access-Control-Allow-Origin: *
Cross-Origin-Resource-Policy: cross-origin
```

## Alternative: Use Cloud Storage

If you can't modify the backend, consider migrating images to:

### Firebase Storage (Recommended)

```typescript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

// Upload image
const uploadImage = async (file: File, caseId: string) => {
  const storageRef = ref(storage, `patients/${caseId}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url; // CORS-friendly URL
};

// Delete image
const deleteImage = async (fileUrl: string) => {
  const storageRef = ref(storage, fileUrl);
  await deleteObject(storageRef);
};
```

### Cloudinary (Free Tier)

1. Sign up at cloudinary.com
2. Get your cloud name and upload preset
3. Upload images:

```typescript
const uploadToCloudinary = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'your_preset_name');
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/your_cloud_name/image/upload`,
    {
      method: 'POST',
      body: formData
    }
  );
  
  const data = await response.json();
  return data.secure_url; // Works everywhere, no CORS issues
};
```

## Current Status

Your frontend is now configured to:
- ✅ Show fallback icon when images fail to load
- ✅ Display helpful error message on hover
- ✅ Still work with documents/PDFs

But the backend needs CORS headers for images to display properly.

## Next Steps

1. **Check browser console** - Look for CORS errors
2. **Contact backend admin** - Share this document
3. **OR migrate to Firebase Storage** - Use the code above

## Temporary Workaround

Images are failing to load, but:
- Files are still stored correctly
- Download buttons still work
- You can see filenames and types
- Once CORS is fixed, images will appear automatically


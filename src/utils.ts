// Utility functions for the medical management system

// Helper function to format dates safely
export const formatDate = (dateString: string | any): string => {
  try {
    // Handle Firebase Timestamp objects
    if (dateString && typeof dateString === 'object' && dateString.toDate) {
      return dateString.toDate().toLocaleDateString('en-GB'); // EU format DD/MM/YYYY
    }
    
    // Handle regular date strings
    if (dateString) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB'); // EU format DD/MM/YYYY
      }
    }
    
    return 'N/A';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

// Helper function to validate and resize icon images to max 1000x1000 JPG
export const validateAndResizeIcon = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Validate file type - only JPG
    if (!file.type.match(/image\/(jpeg|jpg)/)) {
      reject(new Error('Only JPG images are allowed for icons'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Image size must be less than 5MB'));
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to create canvas context'));
      return;
    }

    img.onload = () => {
      // Check dimensions
      const maxDimension = 1000;
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions if larger than max
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and resize image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPG blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to convert image to blob'));
            return;
          }

          // Create a new File object with the resized image
          const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve(resizedFile);
        },
        'image/jpeg',
        0.9 // Quality: 0.9 (90%)
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

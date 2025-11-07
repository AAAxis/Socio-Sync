// API Configuration
// Always use remote backend (production server)
export const API_CONFIG = {
  // Fileserver URL (for patient data and file uploads)
  // Using remote backend for both localhost and production
  FILESERVER_URL: 'https://bucket.roamjet.net',
};

// Helper function to get full API URL
export const getApiUrl = (path: string) => {
  return `${API_CONFIG.FILESERVER_URL}${path}`;
};


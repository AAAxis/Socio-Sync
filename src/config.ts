// API Configuration
const isProduction = window.location.hostname !== 'localhost';

export const API_CONFIG = {
  // Fileserver URL (for patient data and file uploads)
  FILESERVER_URL: isProduction 
    ? 'https://intake.theholylabs.com' 
    : 'http://localhost:3001',
};

// Helper function to get full API URL
export const getApiUrl = (path: string) => {
  return `${API_CONFIG.FILESERVER_URL}${path}`;
};


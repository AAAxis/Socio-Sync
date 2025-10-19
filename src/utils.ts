// Utility functions for the medical management system

// Helper function to format dates safely
export const formatDate = (dateString: string | any): string => {
  try {
    // Handle Firebase Timestamp objects
    if (dateString && typeof dateString === 'object' && dateString.toDate) {
      return dateString.toDate().toLocaleDateString();
    }
    
    // Handle regular date strings
    if (dateString) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }
    
    return 'N/A';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

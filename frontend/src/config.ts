// Configuration for API URL. 
// Uses VITE_API_URL for standalone Backend Worker, or defaults to current origin.
export const API_URL = import.meta.env.VITE_API_URL || '';

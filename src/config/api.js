// API Configuration - Updated for Railway deployment
const API_BASE_URL = import.meta.env.VITE_API_URL || 
                     import.meta.env.VITE_API_BASE_URL || 
                     (import.meta.env.PROD ? 'https://tukkan-production.up.railway.app' : 'http://localhost:5000');

console.log('Environment check:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  PROD: import.meta.env.PROD,
  MODE: import.meta.env.MODE,
  API_BASE_URL: API_BASE_URL
}); // Enhanced debug log

export const API_ENDPOINTS = {
  // User endpoints
  LOGIN: `${API_BASE_URL}/api/users/login`,
  REGISTER: `${API_BASE_URL}/api/users/register`,
  USERS: `${API_BASE_URL}/api/users`,
  
  // Inventory endpoints
  ENVANTER: `${API_BASE_URL}/api/envanter`,
  ENVANTER_RESET: `${API_BASE_URL}/api/envanter/reset`,
  
  // Transaction endpoints
  ISLEMLER: `${API_BASE_URL}/api/islemler`,
  URUN_SATIS: `${API_BASE_URL}/api/urun-satis`,
  URUN_ALIS: `${API_BASE_URL}/api/urun-alis`,
  
  // Financial endpoints
  ACIK_BORCLAR: `${API_BASE_URL}/api/acik-borclar`,
  BEKLENEN_ODEMELER: `${API_BASE_URL}/api/beklenen-odemeler`,
  PLANLANAN_ODEMELER: `${API_BASE_URL}/api/planlanan-odemeler`,
  NAKIT_AKISI: `${API_BASE_URL}/api/nakit-akisi`,
  
  // Employee endpoints
  CALISANLAR: `${API_BASE_URL}/api/calisanlar`,
  
  // Other endpoints
  HEALTH: `${API_BASE_URL}/api/health`
};

// Helper functions for dynamic URLs
export const getApiUrl = (endpoint, params = {}) => {
  let url = API_ENDPOINTS[endpoint] || `${API_BASE_URL}${endpoint}`;
  
  // Replace parameters in URL
  Object.keys(params).forEach(key => {
    url = url.replace(`:${key}`, params[key]);
  });
  
  return url;
};

// For endpoints that need ID or other dynamic parts
export const buildApiUrl = (baseEndpoint, path = '', queryParams = {}) => {
  let url = `${API_BASE_URL}${baseEndpoint}`;
  
  if (path) {
    url += `/${path}`;
  }
  
  // Add query parameters
  const params = new URLSearchParams(queryParams);
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  return url;
};

export default API_BASE_URL; 
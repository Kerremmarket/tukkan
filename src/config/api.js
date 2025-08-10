// API Configuration - Environment aware (local dev vs production)
// Strategy:
// - If VITE_API_URL is provided, use it
// - Otherwise default to same-origin ('') so that:
//   - In local dev, Vite dev server proxy handles '/api' → backend
//   - In production (served by Flask), same-origin '/api' works

const ENV_URL = typeof import.meta !== 'undefined' && import.meta.env
  ? (import.meta.env.VITE_API_URL || '').trim()
  : '';

// When empty, endpoints below will resolve to '/api/...'
const API_BASE_URL = ENV_URL || '';

if (typeof window !== 'undefined') {
  // Helpful runtime logs (safe to keep)
  console.log('[API] Base URL:', API_BASE_URL || '(same-origin)');
}

export const API_ENDPOINTS = {
  // User endpoints
  LOGIN: `${API_BASE_URL}/api/users/login`,
  REGISTER: `${API_BASE_URL}/api/users/register`,
  USERS: `${API_BASE_URL}/api/users`,
  
  // Inventory endpoints
  ENVANTER: `${API_BASE_URL}/api/envanter`,
  
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
  HEALTH: `${API_BASE_URL}/api/health`,
  
  // Media endpoints
  SALE_MEDIA: `${API_BASE_URL}/api/sales`,  // Use with buildApiUrl for /api/sales/{id}/media
  MEDIA_SERVE: `${API_BASE_URL}/api/media/sales`  // Use with buildApiUrl for /api/media/sales/{id}/{filename}
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
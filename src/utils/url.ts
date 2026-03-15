/**
 * Utility for constructing server URLs (API/WS) with robust fallback and proxy support.
 */

export const getServerUrl = (): string => {
  let baseUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
  const currentHostname = window.location.hostname;
  
  // If we are on localhost or a LAN IP, and baseUrl is NOT the same as current origin,
  // we should still prefer relative paths to use the Vite proxy, 
  // UNLESS the user is specifically trying to test the external ngrok URL.
  // If we're accessing locally via localhost or LAN IP, use relative paths for Vite proxy
  const isLocal = currentHostname === 'localhost' || 
                  currentHostname === '127.0.0.1' || 
                  currentHostname.startsWith('192.168.') || 
                  currentHostname.startsWith('10.') || 
                  currentHostname.startsWith('172.');

  if (isLocal) {
    return window.location.origin;
  }

  // Robustness for external links: If using ngrok/devtunnels, ensure we use https
  if (baseUrl.includes('.ngrok-free.dev') || baseUrl.includes('.ngrok.io')) {
    if (baseUrl.startsWith('http:')) {
      baseUrl = baseUrl.replace('http:', 'https:');
    }
  }
  
  return baseUrl;
};

/**
 * Constructs an API URL, preferring relative paths when possible.
 */
export const getApiUrl = (path: string): string => {
  const serverUrl = getServerUrl();
  // Strip query params for prefix check
  const pathWithoutQuery = path.split('?')[0];
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const cleanPathWithoutQuery = pathWithoutQuery.startsWith('/') ? pathWithoutQuery : `/${pathWithoutQuery}`;
  
  // Ensure path starts with /api if it's meant to hit the backend
  let apiPath = cleanPath;
  if (
    !cleanPathWithoutQuery.startsWith('/api') && 
    !cleanPathWithoutQuery.startsWith('/uploads') && 
    !cleanPathWithoutQuery.startsWith('/upload')
  ) {
    apiPath = `/api${cleanPath}`;
  }
  
  if (!serverUrl) {
    return apiPath;
  }
  
  // Combine carefully to avoid double slashes
  const baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
  const finalPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  
  return `${baseUrl}${finalPath}`;
};

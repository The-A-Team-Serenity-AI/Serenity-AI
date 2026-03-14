export const getApiUrl = (path: string) => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  // Strip trailing slash from base if present
  const cleanBase = base.replace(/\/$/, '');
  // Ensure path starts with a slash
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return cleanBase + cleanPath;
};

export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

export const ENDPOINTS = {
  // Auth
  REGISTER: `${BASE_URL}/api/v1/users/register`,
  LOGIN: `${BASE_URL}/api/v1/users/login`,
  LOGOUT: `${BASE_URL}/api/v1/users/logout`,
  CURRENT_USER: `${BASE_URL}/api/v1/users/current-user`,
  REFRESH_TOKEN: `${BASE_URL}/api/v1/users/refresh-token`,
  // Catalog
  COURSES: `${BASE_URL}/api/v1/public/randomproducts`,
  INSTRUCTORS: `${BASE_URL}/api/v1/public/randomusers`,
};

export const REQUEST_TIMEOUT = 10000; // 10 seconds

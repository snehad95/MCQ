import axios from 'axios';

const API = axios.create({
  // Use environment variable VITE_API_URL if available, otherwise relative path
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'ngrok-skip-browser-warning': '69420'
  }
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;

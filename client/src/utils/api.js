import axios from 'axios';

const API = axios.create({
  // Use relative path since we will serve the frontend directly from the backend
  baseURL: '/api',
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

import axios from 'axios';
import API_BASE_URL from './api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to handle multipart/form-data
axiosInstance.interceptors.request.use((config) => {
  // If the request includes FormData, update the Content-Type header
  if (config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data';
  }
  return config;
});

export default axiosInstance;

import axios from 'axios';
import API_BASE_URL from './api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to handle multipart/form-data
axiosInstance.interceptors.request.use((config) => {
  // If the request includes FormData, remove the Content-Type header
  // to let the browser set the correct boundary for multipart/form-data
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response) {
    // Server responded with error status
    console.error('Response error:', error.response.data);
  } else if (error.request) {
    // Request was made but no response received
    console.error('Request error:', error.request);
  } else {
    // Something else happened while setting up the request
    console.error('Error:', error.message);
  }
  return Promise.reject(error);
});

export default axiosInstance;

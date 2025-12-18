import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5001/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const register = (name, email, password) =>
  API.post('/auth/register', { name, email, password });

export const login = (email, password) =>
  API.post('/auth/login', { email, password });

export const getMe = () => API.get('/auth/me');

export const setupProfile = (funderUsername, continent) =>
  API.post('/auth/setup-profile', { funderUsername, continent });

export const submitFund = (destination, funderName, amount, currency) =>
  API.post('/auth/submit-fund', { destination, funderName, amount, currency });

export const getMyFunds = () =>
  API.get('/auth/my-funds');

export const removeFund = (destination, funderName, amount, currency) =>
  API.post('/auth/remove-fund', { destination, funderName, amount, currency });

export const removeCountryFunds = (destination) =>
  API.post('/auth/remove-country', { destination });

export const deleteAccount = () =>
  API.delete('/auth/delete-account');

export default API;

import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_BASE_URL;
let baseURL = '/api';

if (rawApiUrl) {
  const cleanedUrl = rawApiUrl.replace(/\/+$/, '');
  baseURL = cleanedUrl.endsWith('/api') ? cleanedUrl : `${cleanedUrl}/api`;
}

const api = axios.create({
  baseURL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tripsync_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('tripsync_token');
    }
    return Promise.reject(error);
  }
);

export const loginUser = (data) => api.post('/auth/login', data);
export const registerUser = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

export const getTrips = () => api.get('/trips');
export const getTripById = (id) => api.get(`/trips/${id}`);
export const createTrip = (data) => api.post('/trips', data);
export const updateTrip = (id, data) => api.put(`/trips/${id}`, data);
export const deleteTrip = (id) => api.delete(`/trips/${id}`);
export const generateItinerary = (data) => api.post('/ai/generate-itinerary', data);
export const updateItinerary = (data) => api.post('/ai/update-itinerary', data);

export default api;

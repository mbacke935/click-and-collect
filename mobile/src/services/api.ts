import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/theme';

const api = axios.create({ baseURL: API_URL });

// Injecte le token JWT dans chaque requête si disponible
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

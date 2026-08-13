import api from './api';
import * as SecureStore from '../storage/secureStore';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  nom?: string;
  prenom?: string;
  role?: 'client' | 'commercant';
}

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await api.post('/auth/login', payload);
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    return data;
  },

  async register(payload: RegisterPayload) {
    const { data } = await api.post('/auth/register', payload);
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    return data;
  },

  async logout() {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  },

  async getToken() {
    return SecureStore.getItemAsync('accessToken');
  },
};

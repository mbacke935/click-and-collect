import { io, Socket } from 'socket.io-client';
import * as SecureStore from '../storage/secureStore';
import { API_URL } from '../constants/theme';

let socket: Socket | null = null;

// Connecte (ou réutilise) le socket authentifié par le token JWT courant.
export async function connectSocket(): Promise<Socket | null> {
  const token = await SecureStore.getItemAsync('accessToken');
  if (!token) return null;
  if (socket?.connected) return socket;
  socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

import axios from 'axios';
import { obtenerToken, limpiarSesion } from '@/aplicacion/helpers/sesion';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export const http = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ── Request: inyectar JWT ──
http.interceptors.request.use((config) => {
  const token = obtenerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: manejar 401 ──
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      limpiarSesion();
      window.location.href = '/acceso';
    }
    return Promise.reject(error);
  },
);

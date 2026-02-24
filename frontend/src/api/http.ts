import axios from 'axios';
import { obtenerToken, limpiarSesion } from '@/aplicacion/helpers/sesion';
import { manejarErrorPlan } from '@/aplicacion/helpers/plan-guard';

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

// ── Response: manejar 401 y 403 de plan ──
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    // 401 → sesión expirada
    if (status === 401) {
      limpiarSesion();
      window.location.href = '/acceso';
      return Promise.reject(error);
    }

    // 403 → verificar si es error de plan/suscripción
    if (status === 403 && manejarErrorPlan(status, data)) {
      // El modal ya se mostró, rechazamos silenciosamente
      // para que el catch del componente no muestre doble error
      const silenciado = new axios.Cancel('Plan limit — modal shown');
      return Promise.reject(silenciado);
    }

    return Promise.reject(error);
  },
);
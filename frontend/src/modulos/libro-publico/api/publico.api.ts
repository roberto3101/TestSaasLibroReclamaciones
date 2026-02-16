import axios from 'axios';
import type { ApiResponse, Reclamo, CrearReclamoRequest, Tenant, Sede, ReclamoTracking, Mensaje, CrearMensajeRequest } from '@/tipos';

// Tomamos la URL del .env (que tiene el /api/v1) y se lo quitamos dinámicamente.
// Así, si en producción la URL cambia, esto se ajusta solo.
const VITE_API_URL = import.meta.env.VITE_API_URL || '';
const BASE_URL = VITE_API_URL.replace('/api/v1', ''); 

console.log("🔗 API Público apuntando a:", BASE_URL); // Esto es para que veas en consola si apunta al 8080

const httpPublico = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

export const publicoApi = {
  obtenerTenant: (slug: string) =>
    httpPublico.get<ApiResponse<Tenant>>(`/libro/${slug}/tenant`).then((r) => r.data.data),

  obtenerSedes: (slug: string) =>
    httpPublico.get<ApiResponse<Sede[]>>(`/libro/${slug}/sedes`).then((r) => r.data.data),

 crearReclamo: (slug: string, datos: CrearReclamoRequest) =>
    httpPublico.post<ApiResponse<Reclamo>>(`/libro/${slug}/reclamos`, datos).then((r) => r.data.data),

  consultarSeguimiento: (slug: string, codigo: string) =>
    httpPublico.get<ApiResponse<ReclamoTracking>>(`/libro/${slug}/seguimiento/${codigo}`).then((r) => r.data.data),

  listarMensajes: (slug: string, codigo: string) =>
    httpPublico.get<ApiResponse<Mensaje[]>>(`/libro/${slug}/seguimiento/${codigo}/mensajes`).then((r) => r.data.data),

  enviarMensaje: (slug: string, codigo: string, datos: CrearMensajeRequest) =>
    httpPublico.post<ApiResponse<Mensaje>>(`/libro/${slug}/seguimiento/${codigo}/mensajes`, datos).then((r) => r.data.data),
};

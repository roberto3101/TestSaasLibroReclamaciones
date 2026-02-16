import { http } from '@/api/http';
import type { ApiResponse, Suscripcion, ActivarSuscripcionRequest } from '@/tipos';

export const suscripcionApi = {
  obtenerActiva: () =>
    http.get<ApiResponse<Suscripcion>>('/suscripcion/activa').then((r) => r.data.data),

  activar: (datos: ActivarSuscripcionRequest) =>
    http.post<ApiResponse<Suscripcion>>('/suscripcion/activar', datos).then((r) => r.data.data),

  cancelar: () =>
    http.post<ApiResponse<void>>('/suscripcion/cancelar').then((r) => r.data),
};

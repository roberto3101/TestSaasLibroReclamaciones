import { http } from '@/api/http';
import type { ApiResponse, Plan } from '@/tipos';

export const planesApi = {
  listar: () =>
    http.get<ApiResponse<Plan[]>>('/planes').then((r) => r.data.data),

  obtenerPorId: (id: string) =>
    http.get<ApiResponse<Plan>>(`/planes/${id}`).then((r) => r.data.data),
};

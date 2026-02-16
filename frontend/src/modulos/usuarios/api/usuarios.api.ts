import { http } from '@/api/http';
import type { ApiResponse, Usuario, CrearUsuarioRequest, ActualizarUsuarioRequest } from '@/tipos';

export const usuariosApi = {
  listar: () =>
    http.get<ApiResponse<Usuario[]>>('/usuarios').then((r) => r.data.data),

  crear: (datos: CrearUsuarioRequest) =>
    http.post<ApiResponse<Usuario>>('/usuarios', datos).then((r) => r.data.data),

  actualizar: (id: string, datos: ActualizarUsuarioRequest) =>
    http.put<ApiResponse<void>>(`/usuarios/${id}`, datos).then((r) => r.data),

  eliminar: (id: string) =>
    http.delete<ApiResponse<void>>(`/usuarios/${id}`).then((r) => r.data),
};

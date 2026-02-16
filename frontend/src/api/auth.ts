import { http } from './http';
import type { ApiResponse, LoginRequest, LoginResponse, LoginResponseRaw, CambiarPasswordRequest } from '@/tipos';

function parseTenantFromJWT(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.tenant_id ?? '';
  } catch {
    return '';
  }
}

export const authApi = {
  login: async (datos: LoginRequest): Promise<LoginResponse> => {
    const res = await http.post<ApiResponse<LoginResponseRaw>>('/auth/login', datos);
    const raw = res.data.data;
    return {
      token: raw.token,
      usuario: {
        id: raw.user.id,
        email: raw.user.email,
        nombre_completo: raw.user.nombre_completo,
        rol: raw.user.rol,
       tenant_id: raw.user.tenant_id,
        tenant_slug: raw.user.tenant_slug,
        debe_cambiar_password: false,
      },
    };
  },

  cambiarPassword: (datos: CambiarPasswordRequest) =>
    http.post<ApiResponse<void>>('/auth/cambiar-password', datos).then((r) => r.data),

  logout: () =>
    http.post<ApiResponse<void>>('/auth/logout').then((r) => r.data),
};
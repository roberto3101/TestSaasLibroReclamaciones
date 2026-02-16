export interface LoginRequest {
  email: string;
  password: string;
}

// Backend devuelve: { token, expires_in, user: { id, email, nombre_completo, rol } }
export interface LoginResponseRaw {
  token: string;
  expires_in: number;
  user: {
    id: string;
    tenant_id: string;
    tenant_slug: string;
    email: string;
    nombre_completo: string;
    rol: RolUsuario;
  };
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioAuth;
}

export interface UsuarioAuth {
  id: string;
  tenant_id: string;
  tenant_slug: string; // ← Añadir esta línea
  email: string;
  nombre_completo: string;
  rol: RolUsuario;
  debe_cambiar_password: boolean;
}

export type RolUsuario = 'SUPER_ADMIN' | 'ADMIN' | 'SOPORTE' | 'VISOR';

export interface CambiarPasswordRequest {
  password_actual: string;
  password_nueva: string;
}
import type { UsuarioAuth } from '@/tipos';

const CLAVE_TOKEN = 'lr_token';
const CLAVE_USUARIO = 'lr_usuario';

export function guardarSesion(token: string, usuario: UsuarioAuth): void {
  localStorage.setItem(CLAVE_TOKEN, token);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

export function obtenerToken(): string | null {
  return localStorage.getItem(CLAVE_TOKEN);
}

export function obtenerUsuarioGuardado(): UsuarioAuth | null {
  const raw = localStorage.getItem(CLAVE_USUARIO);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UsuarioAuth;
  } catch {
    return null;
  }
}

export function limpiarSesion(): void {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
}

export function haySesionActiva(): boolean {
  return !!obtenerToken();
}

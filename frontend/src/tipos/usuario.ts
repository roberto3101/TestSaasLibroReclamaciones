import type { Nullable } from './api';
import type { RolUsuario } from './auth';

export interface Usuario {
  id: string;
  tenant_id: string;
  email: string;
  nombre_completo: string;
  rol: RolUsuario;
  activo: boolean;
  debe_cambiar_password: boolean;
  ultimo_acceso: Nullable<string>;
  sede_id: Nullable<string>;
  fecha_creacion: string;
  creado_por: Nullable<string>;
}

export interface CrearUsuarioRequest {
  email: string;
  nombre_completo: string;
  password: string;
  rol: RolUsuario;
  sede_id?: string;
}

export interface ActualizarUsuarioRequest {
  nombre_completo: string;
  rol: RolUsuario;
  sede_id?: string;
  activo: boolean;
}

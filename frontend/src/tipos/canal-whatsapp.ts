// ──────────────────────────────────────────────────────────────────────────────
// Tipos del módulo Canales WhatsApp (mirror del backend Go)
// Destino: src/tipos/canal-whatsapp.ts
// ──────────────────────────────────────────────────────────────────────────────

export interface CanalWhatsApp {
  id: string;
  phone_number_id: string;
  display_phone: string;
  nombre_canal: string;
  activo: boolean;
  tiene_access_token: boolean;
  tiene_verify_token: boolean;
  fecha_creacion: string;
}

export interface CrearCanalWARequest {
  phone_number_id: string;
  display_phone?: string;
  access_token: string;
  verify_token?: string;
  nombre_canal?: string;
}

export interface ActualizarCanalWARequest {
  phone_number_id: string;
  display_phone?: string;
  access_token: string;
  verify_token?: string;
  nombre_canal?: string;
  activo: boolean;
}
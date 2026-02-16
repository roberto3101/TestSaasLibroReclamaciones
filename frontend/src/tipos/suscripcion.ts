import type { Nullable } from './api';

export type EstadoSuscripcion = 'ACTIVA' | 'TRIAL' | 'CANCELADA' | 'SUSPENDIDA' | 'VENCIDA';
export type CicloSuscripcion = 'MENSUAL' | 'ANUAL';

export interface Suscripcion {
  id: string;
  tenant_id: string;
  plan_id: string;
  estado: EstadoSuscripcion;
  ciclo: CicloSuscripcion;
  fecha_inicio: string;
  fecha_fin: Nullable<string>;
  fecha_proximo_cobro: Nullable<string>;
  es_trial: boolean;
  dias_trial: number;
  fecha_fin_trial: Nullable<string>;
  override_max_sedes: Nullable<number>;
  override_max_usuarios: Nullable<number>;
  override_max_reclamos: Nullable<number>;
  override_max_chatbots: Nullable<number>;
  override_max_storage_mb: Nullable<number>;
  referencia_pago: Nullable<string>;
  metodo_pago: Nullable<string>;
  activado_por: Nullable<string>;
  notas: Nullable<string>;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface ActivarSuscripcionRequest {
  plan_id: string;
  ciclo: CicloSuscripcion;
  referencia_pago?: string;
  metodo_pago?: string;
}

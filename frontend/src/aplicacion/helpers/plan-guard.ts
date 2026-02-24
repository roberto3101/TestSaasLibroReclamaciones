// src/aplicacion/helpers/plan-guard.ts
// Intercepta errores 403 de límites de plan y muestra modales de upgrade con SweetAlert2.

import Swal from 'sweetalert2';

/** Códigos de error del backend que indican límite de plan */
const CODIGOS_LIMITE_PLAN = new Set([
  'LIMITE_PLAN_EXCEDIDO',
  'PLAN_LIMIT_SEDES',
  'PLAN_LIMIT_USUARIOS',
  'PLAN_LIMIT_RECLAMOS',
  'PLAN_LIMIT_CHATBOTS',
  'PLAN_NO_CHATBOT',
  'PLAN_NO_WHATSAPP',
  'PLAN_NO_REPORTES',
  'PLAN_NO_EXCEL',
  'PLAN_NO_API',
  'FUNCIONALIDAD_NO_DISPONIBLE',
]);

const CODIGOS_SUSCRIPCION = new Set([
  'SUSCRIPCION_INACTIVA',
  'SUSCRIPCION_VENCIDA',
]);

/** Pone el modal de Swal por encima de todo (MUI Dialog usa ~1300) */
function forzarZIndex() {
  const c = Swal.getContainer();
  if (c) c.style.zIndex = '99999';
}

/** Extrae el código de error de la respuesta axios */
function extraerCodigo(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.code === 'string') return obj.code;
  if (obj.error && typeof obj.error === 'object') {
    const err = obj.error as Record<string, unknown>;
    if (typeof err.code === 'string') return err.code;
  }
  return null;
}

/** Extrae el mensaje de error de la respuesta */
function extraerMensaje(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const obj = data as Record<string, unknown>;
  if (typeof obj.message === 'string') return obj.message;
  if (typeof obj.error === 'string') return obj.error;
  if (obj.error && typeof obj.error === 'object') {
    const err = obj.error as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
  }
  return '';
}

/**
 * Verifica si un error 403 es de límite de plan.
 * Si lo es, muestra el modal correspondiente y retorna `true`.
 * Si no, retorna `false` para que el flujo normal de errores lo maneje.
 */
export function manejarErrorPlan(status: number, data: unknown): boolean {
  if (status !== 403) return false;

  const codigo = extraerCodigo(data);
  if (!codigo) return false;

  const mensaje = extraerMensaje(data);

  if (CODIGOS_LIMITE_PLAN.has(codigo)) {
    mostrarModalUpgrade(mensaje);
    return true;
  }

  if (CODIGOS_SUSCRIPCION.has(codigo)) {
    mostrarModalSuscripcion(mensaje, codigo);
    return true;
  }

  return false;
}

/** Modal para límites de recursos (sedes, usuarios, chatbots, etc.) */
function mostrarModalUpgrade(mensaje: string) {
  Swal.fire({
    icon: 'warning',
    title: 'Límite de tu plan alcanzado',
    html: `
      <p style="color:#4b5563;margin-bottom:12px">${mensaje}</p>
      <p style="color:#6b7280;font-size:0.9rem">
        Mejora tu plan para desbloquear más recursos y funcionalidades.
      </p>
    `,
    confirmButtonText: 'Ver planes',
    cancelButtonText: 'Cerrar',
    showCancelButton: true,
    confirmButtonColor: '#f97316',
    cancelButtonColor: '#6b7280',
    didOpen: forzarZIndex,
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = '/suscripcion';
    }
  });
}

/** Modal para suscripción inactiva o vencida */
function mostrarModalSuscripcion(mensaje: string, codigo: string) {
  const esVencida = codigo === 'SUSCRIPCION_VENCIDA';

  Swal.fire({
    icon: esVencida ? 'error' : 'warning',
    title: esVencida ? 'Tu prueba ha expirado' : 'Suscripción inactiva',
    html: `
      <p style="color:#4b5563;margin-bottom:12px">${mensaje}</p>
      <p style="color:#6b7280;font-size:0.9rem">
        ${esVencida
          ? 'Elige un plan para seguir usando la plataforma.'
          : 'Contacta con soporte o activa un plan.'}
      </p>
    `,
    confirmButtonText: esVencida ? 'Elegir plan' : 'Ver planes',
    cancelButtonText: 'Cerrar',
    showCancelButton: !esVencida,
    allowOutsideClick: !esVencida,
    confirmButtonColor: '#f97316',
    cancelButtonColor: '#6b7280',
    didOpen: forzarZIndex,
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = '/suscripcion';
    }
  });
}
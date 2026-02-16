import axios from 'axios';
import { notificar } from './toast';

export function manejarError(error: unknown, mensajeFallback = 'Ocurrió un error inesperado'): string {
  if (axios.isAxiosError(error)) {
   const raw = error.response?.data?.error ?? error.response?.data?.message ?? error.message;
    const mensaje = typeof raw === 'string' ? raw : (raw?.message ?? mensajeFallback);
    notificar.error(mensaje);
    return mensaje;
  }
  if (error instanceof Error) {
    notificar.error(error.message);
    return error.message;
  }
  notificar.error(mensajeFallback);
  return mensajeFallback;
}

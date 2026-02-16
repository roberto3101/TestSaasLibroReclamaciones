import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatoFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  try {
    return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es });
  } catch {
    return fecha;
  }
}

export function formatoFechaHora(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  try {
    return format(parseISO(fecha), 'dd/MM/yyyy HH:mm', { locale: es });
  } catch {
    return fecha;
  }
}

export function formatoRelativo(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  try {
    return formatDistanceToNow(parseISO(fecha), { addSuffix: true, locale: es });
  } catch {
    return fecha;
  }
}

export function formatoMoneda(monto: number | null | undefined): string {
  if (monto == null) return 'S/ 0.00';
  const num = Number(monto);
  if (isNaN(num)) return 'S/ 0.00';
  return `S/ ${num.toFixed(2)}`;
}

export function truncar(texto: string, max = 50): string {
  return texto.length > max ? `${texto.substring(0, max)}...` : texto;
}

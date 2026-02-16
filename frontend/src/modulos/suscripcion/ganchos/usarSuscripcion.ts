import { useState, useEffect, useCallback } from 'react';
import type { Suscripcion } from '@/tipos';
import { suscripcionApi } from '../api/suscripcion.api';
import { manejarError } from '@/aplicacion/helpers/errores';

export function usarSuscripcion() {
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await suscripcionApi.obtenerActiva();
      setSuscripcion(datos);
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { suscripcion, cargando, recargar: cargar };
}

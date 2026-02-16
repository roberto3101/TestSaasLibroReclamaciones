import { useState, useEffect, useCallback } from 'react';
import type { Sede } from '@/tipos';
import { sedesApi } from '../api/sedes.api';
import { manejarError } from '@/aplicacion/helpers/errores';

export function usarSedes() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await sedesApi.listar();
      setSedes(datos);
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { sedes, cargando, recargar: cargar };
}

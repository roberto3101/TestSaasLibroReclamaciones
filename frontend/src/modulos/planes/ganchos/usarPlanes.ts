import { useState, useEffect, useCallback } from 'react';
import type { Plan } from '@/tipos';
import { planesApi } from '../api/planes.api';
import { manejarError } from '@/aplicacion/helpers/errores';

export function usarPlanes() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await planesApi.listar();
      setPlanes(datos);
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { planes, cargando, recargar: cargar };
}

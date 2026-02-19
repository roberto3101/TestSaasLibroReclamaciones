import { useState, useEffect, useCallback } from 'react';
import type { CanalWhatsApp } from '@/tipos/canal-whatsapp';
import { canalesWhatsAppApi } from '../api/canales-whatsapp.api';
import { manejarError } from '@/aplicacion/helpers/errores';

export function usarCanalesWhatsApp() {
  const [canales, setCanales] = useState<CanalWhatsApp[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await canalesWhatsAppApi.listar();
      setCanales(datos || []);
    } catch (error) {
      manejarError(error);
      setCanales([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { canales, cargando, recargar: cargar };
}
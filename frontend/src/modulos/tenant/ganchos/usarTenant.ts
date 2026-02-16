import { useState, useEffect, useCallback } from 'react';
import type { Tenant } from '@/tipos';
import { tenantApi } from '../api/tenant.api';
import { manejarError } from '@/aplicacion/helpers/errores';

export function usarTenant() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await tenantApi.obtener();
      setTenant(datos);
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { tenant, cargando, recargar: cargar };
}

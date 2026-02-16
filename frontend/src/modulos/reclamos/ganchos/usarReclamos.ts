import { useState, useEffect, useCallback } from 'react';
import type { Reclamo, PaginatedResponse } from '@/tipos';
import { reclamosApi } from '../api/reclamos.api';
import { manejarError } from '@/aplicacion/helpers/errores';

export function usarReclamos(paginaInicial = 1, porPagina = 20) {
  const [datos, setDatos] = useState<PaginatedResponse<Reclamo> | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(paginaInicial);

  const cargar = useCallback(async (p: number) => {
    setCargando(true);
    try {
      const resultado = await reclamosApi.listar(p, porPagina);
      setDatos(resultado);
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  }, [porPagina]);

  useEffect(() => {
    cargar(pagina);
  }, [pagina, cargar]);

  const cambiarPagina = (_: unknown, nuevaPagina: number) => setPagina(nuevaPagina);

  return { datos, cargando, pagina, cambiarPagina, recargar: () => cargar(pagina) };
}

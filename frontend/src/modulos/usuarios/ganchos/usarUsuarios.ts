import { useState, useEffect, useCallback } from 'react';
import type { Usuario } from '@/tipos';
import { usuariosApi } from '../api/usuarios.api';
import { manejarError } from '@/aplicacion/helpers/errores';

export function usarUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await usuariosApi.listar();
      setUsuarios(datos);
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { usuarios, cargando, recargar: cargar };
}

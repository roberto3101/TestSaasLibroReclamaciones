import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usarEstadoAuth } from '@/aplicacion/estado/estadoAuth';
import { authApi } from '@/api/auth';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';

export function usarAuth() {
  const { usuario, autenticado, cargando, establecerSesion, cerrarSesion } = usarEstadoAuth();
  const navegar = useNavigate();

  const iniciarSesion = useCallback(
    async (email: string, password: string) => {
      try {
        const { token, usuario } = await authApi.login({ email, password });
        establecerSesion(token, usuario);
        notificar.exito(`Bienvenido, ${usuario.nombre_completo}`);

        if (usuario.debe_cambiar_password) {
          navegar('/cambiar-password');
        } else {
          navegar('/dashboard');
        }
      } catch (error) {
        manejarError(error, 'Credenciales inválidas');
        throw error;
      }
    },
    [establecerSesion, navegar],
  );

  const salir = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignorar error de logout
    } finally {
      cerrarSesion();
      navegar('/acceso');
    }
  }, [cerrarSesion, navegar]);

  return { usuario, autenticado, cargando, iniciarSesion, salir };
}

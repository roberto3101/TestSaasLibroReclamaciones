import { create } from 'zustand';
import type { UsuarioAuth } from '@/tipos';
import { obtenerToken, obtenerUsuarioGuardado, guardarSesion, limpiarSesion } from '@/aplicacion/helpers/sesion';
import { tokenExpirado } from '@/aplicacion/helpers/jwt';

interface EstadoAuth {
  usuario: UsuarioAuth | null;
  token: string | null;
  autenticado: boolean;
  cargando: boolean;

  inicializar: () => void;
  establecerSesion: (token: string, usuario: UsuarioAuth) => void;
  cerrarSesion: () => void;
}

export const usarEstadoAuth = create<EstadoAuth>((set) => ({
  usuario: null,
  token: null,
  autenticado: false,
  cargando: true,

  inicializar: () => {
    const token = obtenerToken();
    const usuario = obtenerUsuarioGuardado();

    if (token && usuario && !tokenExpirado(token)) {
      set({ token, usuario, autenticado: true, cargando: false });
    } else {
      limpiarSesion();
      set({ token: null, usuario: null, autenticado: false, cargando: false });
    }
  },

  establecerSesion: (token, usuario) => {
    guardarSesion(token, usuario);
    set({ token, usuario, autenticado: true });
  },

  cerrarSesion: () => {
    limpiarSesion();
    set({ token: null, usuario: null, autenticado: false });
  },
}));

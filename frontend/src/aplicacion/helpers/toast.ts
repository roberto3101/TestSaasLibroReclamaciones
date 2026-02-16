import toast from 'react-hot-toast';

export const notificar = {
  exito: (mensaje: string) => toast.success(mensaje),
  error: (mensaje: string) => toast.error(mensaje),
  info: (mensaje: string) => toast(mensaje, { icon: 'ℹ️' }),
  advertencia: (mensaje: string) => toast(mensaje, { icon: '⚠️' }),
  cargando: (mensaje: string) => toast.loading(mensaje),
  cerrar: (id?: string) => (id ? toast.dismiss(id) : toast.dismiss()),
  promesa: <T,>(promesa: Promise<T>, mensajes: { cargando: string; exito: string; error: string }) =>
    toast.promise(promesa, {
      loading: mensajes.cargando,
      success: mensajes.exito,
      error: mensajes.error,
    }),
};

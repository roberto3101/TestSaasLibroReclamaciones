import { http } from '@/api/http';
import type { ApiResponse, Mensaje, CrearMensajeRequest } from '@/tipos';

export const mensajesApi = {
  // Obtener todos los mensajes de un reclamo
  listarPorReclamo: async (reclamoId: string) => {
    const { data } = await http.get<ApiResponse<Mensaje[]>>(`/reclamos/${reclamoId}/mensajes`);
    return data.data;
  },

  // Enviar mensaje (Automáticamente lo marca como EMPRESA)
  enviar: async (reclamoId: string, textoMensaje: string) => {
    const payload: CrearMensajeRequest = {
      tipo_mensaje: 'EMPRESA', // <--- IMPORTANTE: Esto indica que responde el admin
      mensaje: textoMensaje
    };
    
    const { data } = await http.post<ApiResponse<Mensaje>>(`/reclamos/${reclamoId}/mensajes`, payload);
    return data.data;
  }
};
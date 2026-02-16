import { useState } from 'react';
import { CodeplexTarjeta, CodeplexCampoTexto, CodeplexBoton, CodeplexCargando } from '@codeplex-sac/ui';
import { CodeplexPila, CodeplexCaja } from '@codeplex-sac/layout';
import { CodeplexIconoEnviar } from '@codeplex-sac/icons';
import { usarMensajes } from '../ganchos/usarMensajes';
import { mensajesApi } from '../api/mensajes.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import { formatoFechaHora } from '@/aplicacion/helpers/formato';

interface Props {
  reclamoId: string;
}

export function ChatMensajes({ reclamoId }: Props) {
  const { mensajes, cargando, recargar } = usarMensajes(reclamoId);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      // CORRECCIÓN: Usamos 'enviar' y pasamos solo el texto
      // (Asumiendo que tu API wrapper ya sabe que el remitente es la EMPRESA/ADMIN)
      await mensajesApi.enviar(reclamoId, texto);
      
      setTexto('');
      notificar.exito('Mensaje enviado');
      recargar();
    } catch (error) {
      manejarError(error);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <CodeplexCargando tipo="puntos" etiqueta="Cargando mensajes..." />;

  // ... (El resto del renderizado se mantiene igual)
  return (
    <CodeplexTarjeta titulo="Seguimiento de Mensajes">
      <CodeplexPila direccion="columna" espaciado={2}>
        <CodeplexCaja
          sx={{
            maxHeight: 400,
            overflowY: 'auto',
            p: 2,
            bgcolor: 'background.default',
            borderRadius: 2,
          }}
        >
          {!mensajes.length && <p style={{ color: '#6b7280', textAlign: 'center' }}>Sin mensajes aún.</p>}
          {mensajes.map((m) => (
            <CodeplexCaja
              key={m.id}
              sx={{
                mb: 1.5,
                p: 1.5,
                borderRadius: 2,
                // Ajuste visual: Si es EMPRESA (nosotros) va a la derecha/azul
                bgcolor: m.tipo_mensaje === 'EMPRESA' ? 'primary.50' : 'grey.100',
                ml: m.tipo_mensaje === 'EMPRESA' ? 4 : 0,
                mr: m.tipo_mensaje === 'CLIENTE' ? 4 : 0,
              }}
            >
              <CodeplexPila direccion="fila" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    {m.tipo_mensaje === 'EMPRESA' ? 'NOSOTROS' : 'CLIENTE'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{formatoFechaHora(m.fecha_mensaje)}</span>
              </CodeplexPila>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{m.mensaje}</p>
            </CodeplexCaja>
          ))}
        </CodeplexCaja>

        <CodeplexPila direccion="fila" espaciado={1}>
          <CodeplexCampoTexto
            etiqueta=""
            valor={texto}
            alCambiar={(e) => setTexto(e.target.value)}
            marcador="Escriba un mensaje..."
            sx={{ flex: 1 }}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && enviar()}
          />
          <CodeplexBoton
            variante="primario"
            soloIcono
            iconoIzquierda={<CodeplexIconoEnviar />}
            estado={enviando ? 'cargando' : 'inactivo'}
            alHacerClick={enviar}
          />
        </CodeplexPila>
      </CodeplexPila>
    </CodeplexTarjeta>
  );
}
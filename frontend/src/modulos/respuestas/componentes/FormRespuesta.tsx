import { useState } from 'react';
import { CodeplexCampoTexto, CodeplexBoton, CodeplexTarjeta } from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import { respuestasApi } from '../api/respuestas.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';

interface Props {
  reclamoId: string;
  alResponder: () => void;
}

export function FormRespuesta({ reclamoId, alResponder }: Props) {
  const [respuesta, setRespuesta] = useState('');
  const [accion, setAccion] = useState('');
  const [compensacion, setCompensacion] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarEnviar = async () => {
    if (!respuesta.trim()) {
      notificar.advertencia('La respuesta es obligatoria');
      return;
    }
    setCargando(true);
    try {
      await respuestasApi.crear(reclamoId, {
        respuesta_empresa: respuesta,
        accion_tomada: accion || undefined,
        compensacion_ofrecida: compensacion || undefined,
      });
      notificar.exito('Respuesta registrada');
      setRespuesta('');
      setAccion('');
      setCompensacion('');
      alResponder();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <CodeplexTarjeta titulo="Nueva Respuesta">
      <CodeplexPila direccion="columna" espaciado={2}>
        <CodeplexCampoTexto
          etiqueta="Respuesta de la Empresa *"
          valor={respuesta}
          alCambiar={(e) => setRespuesta(e.target.value)}
          multilinea
          marcador="Escriba la respuesta al consumidor..."
        />
        <CodeplexCampoTexto
          etiqueta="Acción Tomada"
          valor={accion}
          alCambiar={(e) => setAccion(e.target.value)}
          marcador="Opcional"
        />
        <CodeplexCampoTexto
          etiqueta="Compensación Ofrecida"
          valor={compensacion}
          alCambiar={(e) => setCompensacion(e.target.value)}
          marcador="Opcional"
        />
        <CodeplexBoton
          texto="Enviar Respuesta"
          variante="primario"
          estado={cargando ? 'cargando' : 'inactivo'}
          alHacerClick={manejarEnviar}
        />
      </CodeplexPila>
    </CodeplexTarjeta>
  );
}

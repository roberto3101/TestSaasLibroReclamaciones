import { useState } from 'react';
import { CodeplexSelector, CodeplexCampoTexto, CodeplexBoton, CodeplexTarjeta } from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import type { EstadoReclamo } from '@/tipos';
import { reclamosApi } from '../api/reclamos.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import type { SelectChangeEvent } from '@mui/material/Select';

interface Props {
  reclamoId: string;
  estadoActual: EstadoReclamo;
  alCambiar: () => void;
}

const OPCIONES_ESTADO = [
  { valor: 'PENDIENTE', etiqueta: 'Pendiente' },
  { valor: 'EN_PROCESO', etiqueta: 'En Proceso' },
  { valor: 'RESUELTO', etiqueta: 'Resuelto' },
  { valor: 'CERRADO', etiqueta: 'Cerrado' },
  { valor: 'RECHAZADO', etiqueta: 'Rechazado' },
];

export function FormCambiarEstado({ reclamoId, estadoActual, alCambiar }: Props) {
  const [estado, setEstado] = useState<EstadoReclamo>(estadoActual);
  const [comentario, setComentario] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarSubmit = async () => {
    if (estado === estadoActual) {
      notificar.advertencia('Selecciona un estado diferente');
      return;
    }
    setCargando(true);
    try {
      await reclamosApi.cambiarEstado(reclamoId, { estado, comentario: comentario || undefined });
      notificar.exito('Estado actualizado correctamente');
      alCambiar();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <CodeplexTarjeta titulo="Cambiar Estado">
      <CodeplexPila direccion="columna" espaciado={2}>
        <CodeplexSelector
          etiqueta="Nuevo Estado"
          opciones={OPCIONES_ESTADO}
          value={estado}
          onChange={(e: SelectChangeEvent<unknown>) => setEstado((e.target as HTMLInputElement).value as EstadoReclamo)}
        />
        <CodeplexCampoTexto
          etiqueta="Comentario (opcional)"
          valor={comentario}
          alCambiar={(e) => setComentario(e.target.value)}
          multilinea
          marcador="Motivo del cambio de estado..."
        />
        <CodeplexBoton
          texto="Actualizar Estado"
          variante="primario"
          estado={cargando ? 'cargando' : 'inactivo'}
          alHacerClick={manejarSubmit}
        />
      </CodeplexPila>
    </CodeplexTarjeta>
  );
}
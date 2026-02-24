import { useState } from 'react';
import { CodeplexModal } from '@codeplex-sac/utils';
import { CodeplexCampoTexto, CodeplexSelector, CodeplexBoton } from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import { solicitudesAsesorApi } from '../api/solicitudes-asesor.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import type { CanalOrigenSolicitud, PrioridadSolicitud } from '@/tipos/solicitud-asesor';
import type { SelectChangeEvent } from '@mui/material/Select';

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  alGuardar: () => void;
}

const CANALES: { valor: CanalOrigenSolicitud; etiqueta: string }[] = [
  { valor: 'TELEFONO', etiqueta: 'Teléfono' },
  { valor: 'WEB', etiqueta: 'Web / Chat' },
  { valor: 'WHATSAPP', etiqueta: 'WhatsApp' },
];

const PRIORIDADES: { valor: PrioridadSolicitud; etiqueta: string }[] = [
  { valor: 'BAJA', etiqueta: 'Baja' },
  { valor: 'NORMAL', etiqueta: 'Normal' },
  { valor: 'ALTA', etiqueta: 'Alta' },
  { valor: 'URGENTE', etiqueta: 'Urgente' },
];

export function FormCrearSolicitud({ abierto, alCerrar, alGuardar }: Props) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [motivo, setMotivo] = useState('');
  const [canalOrigen, setCanalOrigen] = useState<CanalOrigenSolicitud>('TELEFONO');
  const [prioridad, setPrioridad] = useState<PrioridadSolicitud>('NORMAL');
  const [cargando, setCargando] = useState(false);

  const limpiar = () => {
    setNombre('');
    setTelefono('');
    setMotivo('');
    setCanalOrigen('TELEFONO');
    setPrioridad('NORMAL');
  };

  const guardar = async () => {
    if (!nombre.trim()) return notificar.advertencia('El nombre es obligatorio');
    if (!telefono.trim()) return notificar.advertencia('El teléfono es obligatorio');
    if (!motivo.trim()) return notificar.advertencia('El motivo es obligatorio');

    setCargando(true);
    try {
      await solicitudesAsesorApi.crear({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        motivo: motivo.trim(),
        canal_origen: canalOrigen,
        prioridad,
      });
      notificar.exito('Solicitud creada exitosamente');
      limpiar();
      alGuardar();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  };

  const cerrar = () => {
    limpiar();
    alCerrar();
  };

  return (
    <CodeplexModal
      open={abierto}
      onClose={cerrar}
      title="Nueva Solicitud de Atención"
      maxWidth="sm"
      footer={
        <CodeplexPila direccion="fila" espaciado={1} sx={{ justifyContent: 'flex-end' }}>
          <CodeplexBoton texto="Cancelar" variante="contorno" alHacerClick={cerrar} />
          <CodeplexBoton
            texto="Crear Solicitud"
            variante="primario"
            estado={cargando ? 'cargando' : 'inactivo'}
            alHacerClick={guardar}
          />
        </CodeplexPila>
      }
    >
      <CodeplexPila direccion="columna" espaciado={2}>
        <CodeplexCampoTexto
          etiqueta="Nombre del solicitante *"
          valor={nombre}
          alCambiar={(e) => setNombre(e.target.value)}
          marcador="Ej: Juan Pérez"
          anchoCompleto
        />

        <CodeplexCampoTexto
          etiqueta="Teléfono *"
          valor={telefono}
          alCambiar={(e) => setTelefono(e.target.value)}
          marcador="Ej: 51999888777"
          textoAyuda="Número con código de país, sin espacios ni guiones"
          anchoCompleto
        />

        <CodeplexCampoTexto
          etiqueta="Motivo de la solicitud *"
          valor={motivo}
          alCambiar={(e) => setMotivo(e.target.value)}
          multilinea
          filas={3}
          marcador="Describa brevemente el motivo de la atención..."
          anchoCompleto
        />

        <CodeplexPila direccion="fila" espaciado={2}>
          <CodeplexSelector
            etiqueta="Canal de origen"
            opciones={CANALES}
            value={canalOrigen}
            alCambiar={(e: SelectChangeEvent<unknown>) => setCanalOrigen(e.target.value as CanalOrigenSolicitud)}
          />
          <CodeplexSelector
            etiqueta="Prioridad"
            opciones={PRIORIDADES}
            value={prioridad}
            alCambiar={(e: SelectChangeEvent<unknown>) => setPrioridad(e.target.value as PrioridadSolicitud)}
          />
        </CodeplexPila>
      </CodeplexPila>
    </CodeplexModal>
  );
}
import { useMemo } from 'react';
import { CodeplexTabla, type MRT_ColumnDef } from '@codeplex-sac/data-view';
import { CodeplexInsignia } from '@codeplex-sac/ui';
import { Typography } from '@mui/material';
import type { APIKey } from '@/tipos/chatbot';
import { chatbotsApi } from '../api/chatbots.api';
import { confirmarEliminacion } from '@/aplicacion/helpers/confirmar';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import { formatoFecha } from '@/aplicacion/helpers/formato';

interface Props {
  keys: APIKey[];
  chatbotId: string;
  alRecargar: () => void;
}

export function TablaAPIKeys({ keys, chatbotId, alRecargar }: Props) {
  
  const revocar = async (apiKey: APIKey) => {
    // CORREGIDO: Solo enviamos 1 argumento si tu helper no soporta mensaje personalizado
    const ok = await confirmarEliminacion('API Key'); 
    if (!ok) return;
    try {
      await chatbotsApi.revocarKey(chatbotId, apiKey.id);
      notificar.exito('API Key revocada correctamente');
      alRecargar();
    } catch (error) {
      manejarError(error);
    }
  };

  const columnas = useMemo<MRT_ColumnDef<APIKey>[]>(
    () => [
      { 
        accessorKey: 'nombre', 
        header: 'Nombre', 
        size: 180,
        Cell: ({ cell }) => (
          <Typography variant="body2" fontWeight={600} color="text.primary">
            {cell.getValue<string>()}
          </Typography>
        )
      },
      { 
        accessorKey: 'key_prefix', 
        header: 'Prefijo (Token)', 
        size: 160,
        Cell: ({ cell }) => (
          <Typography variant="body2" fontFamily="monospace" sx={{ bgcolor: '#f1f5f9', px: 1, borderRadius: 1 }}>
            {cell.getValue<string>()}...
          </Typography>
        )
      },
      { 
        accessorKey: 'entorno', 
        header: 'Entorno', 
        size: 100,
        Cell: ({ cell }) => (
           cell.getValue<string>() === 'LIVE' 
             ? <CodeplexInsignia contenido="PRODUCCION" color="error" variante="estandar" />
             : <CodeplexInsignia contenido="TEST" color="advertencia" variante="estandar" />
        )
      },
      {
        accessorKey: 'activa',
        header: 'Estado',
        size: 100,
        Cell: ({ cell }) =>
          cell.getValue<boolean>() ? (
            <CodeplexInsignia contenido="VIGENTE" color="exito" variante="punto" />
          ) : (
            <CodeplexInsignia contenido="REVOCADA" color="secundario" variante="punto" />
          ),
      },
      {
        accessorKey: 'fecha_expiracion',
        header: 'Expira',
        size: 120,
        Cell: ({ cell }) => (
            <Typography variant="caption" color="text.secondary">
                {formatoFecha(cell.getValue<string>())}
            </Typography>
        ),
      },
    ],
    []
  );

  return (
    <CodeplexTabla
      titulo="" 
      columnas={columnas}
      datos={keys || []}
      onEliminar={revocar}
      opciones={{
        enableTopToolbar: false,
        enableBottomToolbar: false,
        muiTableHeadCellProps: {
            sx: {
              fontWeight: 700,
              backgroundColor: '#f8fafc',
              color: '#64748b',
              fontSize: '11px',
              textTransform: 'uppercase',
            },
        },
        muiTableBodyRowProps: { hover: true },
        initialState: { density: 'compact' }
      }}
    />
  );
}
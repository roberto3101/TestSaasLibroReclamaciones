import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Tooltip } from '@mui/material';
import { CodeplexTabla, type MRT_ColumnDef } from '@codeplex-sac/data-view';
import { CodeplexInsignia, type CodeplexInsigniaColor } from '@codeplex-sac/ui';
import { CodeplexPaginacion } from '@codeplex-sac/navigation';
import type { Reclamo, EstadoReclamo } from '@/tipos';
import { ESTADOS_RECLAMO } from '@/tipos/reclamo';
import { formatoFechaHora, formatoMoneda, formatoRelativo } from '@/aplicacion/helpers/formato';

interface Props {
  reclamos: Reclamo[];
  total: number;
  pagina: number;
  cargando: boolean;
  alCambiarPagina: (_: unknown, p: number) => void;
}

const obtenerColorEstado = (estado: EstadoReclamo): CodeplexInsigniaColor => {
  switch (estado) {
    case 'PENDIENTE': return 'advertencia';
    case 'EN_PROCESO': return 'info';
    case 'RESUELTO': return 'exito';
    case 'RECHAZADO': return 'error';
    case 'CERRADO': return 'secundario';
    default: return 'primario';
  }
};

export function TablaReclamos({ reclamos, total, pagina, cargando, alCambiarPagina }: Props) {
  const navegar = useNavigate();

  const columnas = useMemo<MRT_ColumnDef<Reclamo>[]>(
    () => [
      {
        accessorKey: 'codigo_reclamo',
        header: 'Código / Origen',
        size: 155,
        enableClickToCopy: true,
        Cell: ({ row }) => (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="primary.main" sx={{ letterSpacing: '-0.2px' }}>
              {row.original.codigo_reclamo}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3, fontSize: '11px', opacity: 0.7 }}>
              {row.original.canal_origen}
            </Typography>
          </Box>
        ),
      },
      {
        accessorKey: 'nombre_completo',
        header: 'Consumidor',
        size: 200,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Tooltip title={row.original.nombre_completo} placement="top">
              <Typography
                variant="body2"
                fontWeight={500}
                noWrap
                sx={{ maxWidth: '100%', display: 'block', color: '#1f2937' }}
              >
                {row.original.nombre_completo}
              </Typography>
            </Tooltip>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '11px' }}>
              {row.original.tipo_documento}: {row.original.numero_documento}
            </Typography>
          </Box>
        ),
      },
      {
        accessorKey: 'sede_nombre',
        header: 'Sede y Bien',
        size: 180,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Tooltip title={row.original.sede_nombre || 'Sede Principal'} placement="top">
              <Typography variant="body2" noWrap sx={{ color: '#374151' }}>
                {row.original.sede_nombre || 'Sede Principal'}
              </Typography>
            </Tooltip>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ mt: 0.3, fontSize: '11px' }}>
              {row.original.tipo_bien || 'SERVICIO'}
            </Typography>
          </Box>
        ),
      },
      {
        accessorKey: 'monto_reclamado',
        header: 'Monto',
        size: 100,
        muiTableBodyCellProps: { align: 'right' },
        muiTableHeadCellProps: { align: 'right' },
        Cell: ({ cell }) => {
          const valor = cell.getValue<any>();
          const montoReal = valor?.Float64 !== undefined ? valor.Float64 : valor;

          return (
            <Typography variant="body2" fontFamily="'JetBrains Mono', monospace" fontWeight={500} sx={{ color: '#374151' }}>
              {formatoMoneda(montoReal)}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        size: 150,
        muiTableBodyCellProps: {
          align: 'center',
          sx: { paddingLeft: '0 !important', paddingRight: '0 !important' }
        },
        muiTableHeadCellProps: { align: 'center' },
        Cell: ({ cell }) => {
          const estado = cell.getValue<EstadoReclamo>();
          const info = ESTADOS_RECLAMO[estado];

          return (
            <Box sx={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
              <CodeplexInsignia
                contenido={info?.etiqueta ?? estado}
                color={obtenerColorEstado(estado)}
                variante="estandar"
                superposicion="rectangular"
              />
            </Box>
          );
        },
      },
      {
        accessorKey: 'fecha_registro',
        header: 'Fecha',
        size: 160,
        Cell: ({ cell }) => (
          <Box>
            <Typography variant="body2" sx={{ color: '#374151', fontSize: '13px' }}>
              {formatoFechaHora(cell.getValue<string>())}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', fontSize: '11px', mt: 0.3 }}>
              {formatoRelativo(cell.getValue<string>())}
            </Typography>
          </Box>
        ),
      },
    ],
    []
  );

  return (
    <>
      <CodeplexTabla
        titulo="Gestión de Reclamos"
        columnas={columnas}
        datos={reclamos}
        cargando={cargando}
        habilitarExportacion
        opciones={{
          enableRowActions: true,
          positionActionsColumn: 'last',
          enableColumnResizing: true,
          layoutMode: 'grid',
          muiTableBodyCellProps: {
            sx: {
              verticalAlign: 'middle',
              py: 1.2,
              borderBottom: '1px solid #f1f5f9',
            },
          },
          muiTableHeadCellProps: {
            sx: {
              fontWeight: 700,
              backgroundColor: '#f8fafc',
              color: '#64748b',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: '2px solid #e2e8f0',
            },
          },
          muiTableBodyRowProps: ({ row }) => ({
            sx: {
              cursor: 'pointer',
              transition: 'background-color 0.15s',
              '&:hover': {
                backgroundColor: '#f8fafc',
              },
            },
            onClick: () => navegar(`/reclamos/${row.original.id}`),
          }),
          initialState: {
            density: 'compact',
            pagination: { pageSize: 10, pageIndex: 0 },
          },
        }}
        onEditar={(fila) => navegar(`/reclamos/${fila.id}`)}
      />

      {total > 0 && (
        <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'center' }}>
          <CodeplexPaginacion
            total={total}
            pagina={pagina}
            alCambiar={alCambiarPagina}
            centrado
            color="primary"
          />
        </Box>
      )}
    </>
  );
}
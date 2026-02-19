import { useState, useMemo } from 'react';
import { CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexBoton, CodeplexInsignia, CodeplexAlerta } from '@codeplex-sac/ui';
import { CodeplexTabla, type MRT_ColumnDef } from '@codeplex-sac/data-view';
import { CodeplexIconoAñadir, CodeplexIconoEditar, CodeplexIconoBorrar } from '@codeplex-sac/icons';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import { usarCanalesWhatsApp } from '../ganchos/usarCanalesWhatsApp';
import { canalesWhatsAppApi } from '../api/canales-whatsapp.api';
import { FormCanalWhatsApp } from '../componentes/FormCanalWhatsApp';
import type { CanalWhatsApp } from '@/tipos/canal-whatsapp';
import { formatoFechaHora, formatoRelativo } from '@/aplicacion/helpers/formato';
import { confirmarEliminacion } from '@/aplicacion/helpers/confirmar';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';

export default function PaginaCanalesWhatsApp() {
  const { canales, cargando, recargar } = usarCanalesWhatsApp();
  const [mostrarModal, setMostrarModal] = useState(false);
  const [canalEditar, setCanalEditar] = useState<CanalWhatsApp | null>(null);

  const alDesactivar = async (canal: CanalWhatsApp) => {
    const ok = await confirmarEliminacion('canal WhatsApp');
    if (!ok) return;
    try {
      await canalesWhatsAppApi.desactivar(canal.id);
      notificar.exito('Canal WhatsApp desactivado');
      recargar();
    } catch (error) {
      manejarError(error);
    }
  };

  const columnas = useMemo<MRT_ColumnDef<CanalWhatsApp>[]>(
    () => [
      {
        accessorKey: 'nombre_canal',
        header: 'Canal',
        size: 200,
        Cell: ({ row }) => (
          <Box sx={{ opacity: row.original.activo ? 1 : 0.55 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              {row.original.nombre_canal}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.3, fontSize: '11px', fontFamily: 'monospace' }}
            >
              {row.original.display_phone || row.original.phone_number_id}
            </Typography>
          </Box>
        ),
      },
      {
        accessorKey: 'phone_number_id',
        header: 'Phone Number ID',
        size: 180,
        Cell: ({ cell }) => (
          <Typography
            variant="body2"
            fontFamily="monospace"
            sx={{ bgcolor: '#f1f5f9', px: 1, py: 0.3, borderRadius: 1, fontSize: '12px' }}
          >
            {cell.getValue<string>()}
          </Typography>
        ),
      },
      {
        accessorKey: 'activo',
        header: 'Estado',
        size: 110,
        muiTableBodyCellProps: { align: 'center' },
        muiTableHeadCellProps: { align: 'center' },
        Cell: ({ cell }) => (
          <Box sx={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
            <CodeplexInsignia
              contenido={cell.getValue<boolean>() ? 'ACTIVO' : 'INACTIVO'}
              color={cell.getValue<boolean>() ? 'exito' : 'error'}
              variante="estandar"
              superposicion="rectangular"
            />
          </Box>
        ),
      },
      {
        id: 'tokens',
        header: 'Tokens',
        size: 140,
        muiTableBodyCellProps: { align: 'center' },
        muiTableHeadCellProps: { align: 'center' },
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.8, justifyContent: 'center' }}>
            <Tooltip title={row.original.tiene_access_token ? 'Access Token configurado' : 'Sin Access Token'}>
              <Box
                sx={{
                  px: 1,
                  py: 0.2,
                  borderRadius: 1,
                  fontSize: '10px',
                  fontWeight: 700,
                  bgcolor: row.original.tiene_access_token ? '#dcfce7' : '#fee2e2',
                  color: row.original.tiene_access_token ? '#166534' : '#991b1b',
                }}
              >
                {row.original.tiene_access_token ? '✓ Token' : '✗ Token'}
              </Box>
            </Tooltip>
          </Box>
        ),
      },
      {
        accessorKey: 'fecha_creacion',
        header: 'Creado',
        size: 160,
        Cell: ({ cell }) => (
          <Box>
            <Typography variant="body2" sx={{ color: '#374151', fontSize: '13px' }}>
              {formatoFechaHora(cell.getValue<string>())}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontStyle: 'italic', display: 'block', fontSize: '11px' }}
            >
              {formatoRelativo(cell.getValue<string>())}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'acciones',
        header: 'Acciones',
        size: 120,
        muiTableBodyCellProps: { align: 'right' },
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            <Tooltip title="Editar">
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setCanalEditar(row.original);
                  setMostrarModal(true);
                }}
              >
                <CodeplexIconoEditar sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Desactivar">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  alDesactivar(row.original);
                }}
              >
                <CodeplexIconoBorrar sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [],
  );

  const canalesActivos = canales.filter((c) => c.activo).length;

  return (
    <CodeplexPila direccion="columna" espaciado={3}>
      {/* Header */}
      <CodeplexPila
        direccion="fila"
        sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
      >
        <Box>
          <h2 style={{ margin: 0 }}>Canales WhatsApp</h2>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Configura los números de WhatsApp Business que recibirán mensajes de tus clientes.
          </Typography>
        </Box>
        <CodeplexBoton
          texto="Nuevo Canal"
          variante="primario"
          iconoIzquierda={<CodeplexIconoAñadir />}
          alHacerClick={() => {
            setCanalEditar(null);
            setMostrarModal(true);
          }}
        />
      </CodeplexPila>

      {/* Info */}
      {canales.length === 0 && !cargando && (
        <CodeplexAlerta
          variante="info"
          titulo="Sin canales configurados"
          descripcion="Agrega tu primer número de WhatsApp Business para comenzar a recibir mensajes de tus clientes automáticamente."
        />
      )}

      {canalesActivos > 0 && (
        <Box
          sx={{
            p: 2,
            bgcolor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <span style={{ fontSize: 20 }}>📱</span>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="#166534">
              {canalesActivos} canal{canalesActivos !== 1 ? 'es' : ''} activo{canalesActivos !== 1 ? 's' : ''}
            </Typography>
            <Typography variant="body2" color="#15803d" sx={{ fontSize: '13px' }}>
              Los mensajes entrantes se resuelven automáticamente al tenant correcto.
            </Typography>
          </Box>
        </Box>
      )}

      {/* Tabla */}
      <CodeplexTabla
        titulo="Mis Canales"
        columnas={columnas}
        datos={canales}
        cargando={cargando}
        opciones={{
          enableRowActions: false,
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
          muiTableBodyRowProps: {
            sx: {
              transition: 'background-color 0.15s',
              '&:hover': { backgroundColor: '#f8fafc' },
            },
          },
          initialState: {
            density: 'compact',
            pagination: { pageSize: 10, pageIndex: 0 },
          },
        }}
      />

      {/* Modal crear/editar */}
      <FormCanalWhatsApp
        abierto={mostrarModal}
        canalEditar={canalEditar}
        alCerrar={() => {
          setMostrarModal(false);
          setCanalEditar(null);
        }}
        alGuardar={() => {
          setMostrarModal(false);
          setCanalEditar(null);
          recargar();
        }}
      />
    </CodeplexPila>
  );
}
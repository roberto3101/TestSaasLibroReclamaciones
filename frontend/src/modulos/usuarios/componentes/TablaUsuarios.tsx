import { useMemo } from 'react';
import { Box, Typography, Tooltip, Chip, Avatar } from '@mui/material';
import { CodeplexTabla, type MRT_ColumnDef } from '@codeplex-sac/data-view';
import type { Usuario } from '@/tipos';
import type { Sede } from '@/tipos';
import { formatoFechaHora, formatoRelativo } from '@/aplicacion/helpers/formato';
import { confirmarEliminacion } from '@/aplicacion/helpers/confirmar';
import { usuariosApi } from '../api/usuarios.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';

interface Props {
  usuarios: Usuario[];
  sedes: Sede[];
  cargando: boolean;
  alRecargar: () => void;
  alEditar: (usuario: Usuario) => void;
  usuarioActualId?: string;
}

const ROL_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  ADMIN: { label: 'Administrador', bg: '#fef2f2', color: '#dc2626', icon: '🛡️' },
  SOPORTE: { label: 'Soporte', bg: '#eff6ff', color: '#2563eb', icon: '🎧' },
};

export function TablaUsuarios({ usuarios, sedes, cargando, alRecargar, alEditar, usuarioActualId }: Props) {

  const sedesMap = useMemo(() => {
    const map: Record<string, string> = {};
    sedes.forEach((s) => { map[s.id] = s.nombre; });
    return map;
  }, [sedes]);

  const manejarEliminar = async (fila: Usuario) => {
    if (fila.id === usuarioActualId) {
      notificar.advertencia('No puedes desactivar tu propia cuenta');
      return;
    }
    const confirmado = await confirmarEliminacion('usuario');
    if (!confirmado) return;
    try {
      await usuariosApi.eliminar(fila.id);
      notificar.exito('Usuario desactivado');
      alRecargar();
    } catch (error) {
      manejarError(error);
    }
  };

  const columnas = useMemo<MRT_ColumnDef<Usuario>[]>(
    () => [
      {
        accessorKey: 'nombre_completo',
        header: 'Usuario',
        size: 280,
        Cell: ({ row }) => {
          const esYo = row.original.id === usuarioActualId;
          const iniciales = row.original.nombre_completo
            .split(' ')
            .map((p) => p[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  bgcolor: esYo ? '#1a56db' : '#e2e8f0',
                  color: esYo ? '#fff' : '#475569',
                }}
              >
                {iniciales}
              </Avatar>
              <Box sx={{ overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Tooltip title={row.original.nombre_completo}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="text.primary"
                      noWrap
                      sx={{ display: 'block', textTransform: 'capitalize' }}
                    >
                      {row.original.nombre_completo.toLowerCase()}
                    </Typography>
                  </Tooltip>
                  {esYo && (
                    <Chip
                      label="Tú"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: '#1a56db',
                        color: '#fff',
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  )}
                </Box>
                <Tooltip title={row.original.email}>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {row.original.email}
                  </Typography>
                </Tooltip>
              </Box>
            </Box>
          );
        },
      },
      {
        accessorKey: 'rol',
        header: 'Rol',
        size: 160,
        Cell: ({ cell }) => {
          const rol = cell.getValue<string>();
          const config = ROL_CONFIG[rol] || ROL_CONFIG.SOPORTE;
          return (
            <Chip
              label={`${config.icon} ${config.label}`}
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: '0.75rem',
                bgcolor: config.bg,
                color: config.color,
                border: `1px solid ${config.color}20`,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          );
        },
      },
      {
        accessorKey: 'sede_id',
        header: 'Sede',
        size: 180,
        Cell: ({ cell }) => {
          const raw = cell.getValue<any>();
          const sedeId = typeof raw === 'object' && raw !== null ? raw.UUID || null : raw;
          const nombre = sedeId && sedeId !== '00000000-0000-0000-0000-000000000000' ? sedesMap[sedeId] : null;
          return (
            <Typography variant="body2" sx={{ color: nombre ? '#374151' : '#16a34a', fontSize: '13px', fontWeight: nombre ? 400 : 600 }}>
              {nombre || '🌐 Acceso global'}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'ultimo_acceso',
        header: 'Último Acceso',
        size: 180,
        Cell: ({ cell }) => {
          const valor = cell.getValue<string>();
          if (!valor) {
            return (
              <Chip
                label="Sin acceso"
                size="small"
                sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 500, fontSize: '0.72rem' }}
              />
            );
          }
          return (
            <Box>
              <Typography variant="body2" sx={{ fontSize: '13px', color: '#374151' }}>
                {formatoFechaHora(valor)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block' }}>
                {formatoRelativo(valor)}
              </Typography>
            </Box>
          );
        },
      },
    ],
    [usuarioActualId, sedesMap],
  );

  return (
    <CodeplexTabla
      columnas={columnas}
      datos={usuarios}
      cargando={cargando}
      onEditar={alEditar}
      onEliminar={manejarEliminar}
      opciones={{
        enableRowActions: true,
        positionActionsColumn: 'last',
        enableColumnResizing: true,
        layoutMode: 'grid',
        muiTableBodyRowProps: ({ row }) => ({
          sx: {
            ...(row.original.id === usuarioActualId && {
              bgcolor: '#eff6ff',
              '&:hover': { bgcolor: '#dbeafe !important' },
            }),
          },
        }),
        muiTableBodyCellProps: {
          sx: { verticalAlign: 'middle', py: 1.2 },
        },
        muiTableHeadCellProps: {
          sx: { fontWeight: 'bold', backgroundColor: '#f8fafc' },
        },
        initialState: {
          density: 'comfortable',
          pagination: { pageSize: 10, pageIndex: 0 },
        },
      }}
    />
  );
}
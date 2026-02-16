import { useMemo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { CodeplexTabla, type MRT_ColumnDef } from '@codeplex-sac/data-view';
import { CodeplexInsignia, type CodeplexInsigniaColor } from '@codeplex-sac/ui';
import type { Usuario } from '@/tipos';
import { formatoFechaHora, formatoRelativo } from '@/aplicacion/helpers/formato';
import { confirmarEliminacion } from '@/aplicacion/helpers/confirmar';
import { usuariosApi } from '../api/usuarios.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';

interface Props {
  usuarios: Usuario[];
  cargando: boolean;
  alRecargar: () => void;
}

// Helper para colores de roles (similar a estados de reclamo)
const obtenerColorRol = (rol: string): CodeplexInsigniaColor => {
  switch (rol) {
    case 'ADMIN': return 'error';      // Rojo para altos privilegios
    case 'SOPORTE': return 'info';     // Azul para operativos
    case 'VISOR': return 'secundario'; // Gris para solo lectura
    default: return 'primario';
  }
};

export function TablaUsuarios({ usuarios, cargando, alRecargar }: Props) {
  
  const manejarEliminar = async (fila: Usuario) => {
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
        size: 250,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Tooltip title={row.original.nombre_completo}>
              <Typography 
                variant="body2" 
                fontWeight={600} 
                color="text.primary"
                noWrap 
                sx={{ display: 'block' }}
              >
                {row.original.nombre_completo}
              </Typography>
            </Tooltip>
            <Tooltip title={row.original.email}>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                noWrap 
                sx={{ mt: 0.5, display: 'block' }}
              >
                {row.original.email}
              </Typography>
            </Tooltip>
          </Box>
        ),
      },
      {
        accessorKey: 'rol',
        header: 'Rol',
        size: 120,
        muiTableBodyCellProps: {
            align: 'center',
            sx: { paddingLeft: '0 !important', paddingRight: '0 !important' }
        },
        muiTableHeadCellProps: {
            align: 'center',
        },
        Cell: ({ cell }) => {
          const rol = cell.getValue<string>();
          return (
            <Box sx={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
              <CodeplexInsignia 
                contenido={rol} 
                color={obtenerColorRol(rol)} 
                variante="estandar"
                superposicion="rectangular"
              />
            </Box>
          );
        },
      },
      {
        accessorKey: 'ultimo_acceso',
        header: 'Último Acceso',
        size: 180,
        Cell: ({ cell }) => {
          const valor = cell.getValue<string>();
          return (
            <Box>
              <Typography variant="body2">
                {valor ? formatoFechaHora(valor) : 'Nunca'}
              </Typography>
              {valor && (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block' }}>
                  {formatoRelativo(valor)}
                </Typography>
              )}
            </Box>
          );
        },
      },
    ],
    []
  );

  return (
    <CodeplexTabla
      titulo="Gestión de Usuarios"
      columnas={columnas}
      datos={usuarios}
      cargando={cargando}
      habilitarExportacion
      onEliminar={manejarEliminar}
      // Aplicamos los mismos estilos visuales de TablaReclamos
      opciones={{
        enableRowActions: true,
        positionActionsColumn: 'last',
        enableColumnResizing: true,
        layoutMode: 'grid',
        muiTableBodyCellProps: {
          sx: {
            verticalAlign: 'middle',
            py: 1,
          },
        },
        muiTableHeadCellProps: {
          sx: {
            fontWeight: 'bold',
            backgroundColor: '#f8fafc',
          },
        },
        initialState: {
          density: 'compact',
          pagination: { pageSize: 10, pageIndex: 0 },
        },
      }}
    />
  );
}
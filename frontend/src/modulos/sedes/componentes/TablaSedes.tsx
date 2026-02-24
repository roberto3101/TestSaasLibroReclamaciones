import { useState, useMemo } from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import { CodeplexTabla, type MRT_ColumnDef } from '@codeplex-sac/data-view';
import { CodeplexInsignia } from '@codeplex-sac/ui';
import type { Sede } from '@/tipos';
import { confirmarEliminacion } from '@/aplicacion/helpers/confirmar';
import { sedesApi } from '../api/sedes.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';

interface Props {
  sedes: Sede[];
  cargando: boolean;
  alRecargar: () => void;
  alEditar: (sede: Sede) => void;
  tenantSlug: string;
}

export function TablaSedes({ sedes, cargando, alRecargar, alEditar, tenantSlug }: Props) {
  const [copiado, setCopiado] = useState<string | null>(null);

  // --- LÓGICA DE NEGOCIO (Intacta) ---

  const obtenerUrlLibro = (sede: Sede): string => {
    if (!tenantSlug) return '';
    // Usamos window.location.origin para asegurar el dominio actual
    return `${window.location.origin}/libro/${tenantSlug}?sede=${sede.slug}`;
  };

  const copiarUrl = async (sede: Sede) => {
    const url = obtenerUrlLibro(sede);
    if (!url) {
      notificar.advertencia('No se pudo obtener la URL del libro');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(sede.id);
      notificar.exito('URL copiada al portapapeles');
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      notificar.error('No se pudo copiar la URL');
    }
  };

  const manejarEliminar = async (sede: Sede) => {
    if (sede.es_principal) {
      notificar.advertencia('No puedes desactivar la sede principal');
      return;
    }
    const confirmado = await confirmarEliminacion('sede');
    if (!confirmado) return;

    try {
      await sedesApi.eliminar(sede.id);
      notificar.exito('Sede desactivada correctamente');
      alRecargar();
    } catch (error) {
      manejarError(error);
    }
  };

  // --- DEFINICIÓN DE COLUMNAS ---

  const columnas = useMemo<MRT_ColumnDef<Sede>[]>(
    () => [
      {
        accessorKey: 'nombre',
        header: 'Sede',
        size: 200,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Typography variant="body2" fontWeight={600} color="text.primary" noWrap>
              {row.original.nombre}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontFamily="monospace" noWrap>
              {row.original.slug}
            </Typography>
          </Box>
        ),
      },
      {
        accessorKey: 'direccion',
        header: 'Ubicación',
        size: 220,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Tooltip title={row.original.direccion}>
              <Typography variant="body2" noWrap sx={{ display: 'block' }}>
                {row.original.direccion}
              </Typography>
            </Tooltip>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
              {row.original.distrito || '—'}
            </Typography>
          </Box>
        ),
      },
      {
        accessorKey: 'responsable_nombre',
        header: 'Responsable',
        size: 180,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
             <Typography variant="body2" noWrap>
                {row.original.responsable_nombre || '—'}
             </Typography>
             {row.original.responsable_cargo && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {row.original.responsable_cargo}
                </Typography>
             )}
          </Box>
        ),
      },
      {
        accessorKey: 'telefono', // Usamos telefono como key, pero renderizamos ambos contactos
        header: 'Contacto',
        size: 160,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {row.original.telefono ? (
                <Typography variant="caption" color="text.primary">
                    {row.original.telefono}
                </Typography>
            ) : null}
            {row.original.email ? (
                <Typography variant="caption" color="primary.main" noWrap>
                    {row.original.email}
                </Typography>
            ) : null}
            {!row.original.telefono && !row.original.email && (
                <Typography variant="caption" color="text.disabled">—</Typography>
            )}
          </Box>
        ),
      },
      {
        accessorKey: 'es_principal',
        header: 'Principal',
        size: 100,
        muiTableBodyCellProps: { align: 'center' },
        muiTableHeadCellProps: { align: 'center' },
        Cell: ({ cell }) => {
          const esPrincipal = cell.getValue<boolean>();
          return (
             <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <CodeplexInsignia 
                    contenido={esPrincipal ? 'Sí' : 'No'}
                    color={esPrincipal ? 'exito' : 'secundario'}
                    variante="estandar"
                    superposicion="rectangular"
                />
             </Box>
          );
        },
      },
      {
        id: 'url_libro',
        header: 'Libro Público',
        size: 180,
        Cell: ({ row }) => {
            const url = obtenerUrlLibro(row.original);
            const isCopied = copiado === row.original.id;

            if (!tenantSlug) return <Typography variant="caption" color="text.disabled">—</Typography>;

            return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        fontFamily="monospace" 
                        noWrap 
                        sx={{ maxWidth: 120, display: 'block' }}
                        title={url}
                    >
                        ?sede={row.original.slug}
                    </Typography>
                    
                    <Tooltip title={isCopied ? "Copiado" : "Copiar URL"}>
                        <IconButton 
                            onClick={() => copiarUrl(row.original)}
                            size="small"
                            sx={{ 
                                color: isCopied ? 'success.main' : 'action.active',
                                bgcolor: isCopied ? 'success.lighter' : 'transparent'
                            }}
                        >
                             {isCopied ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                             ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                             )}
                        </IconButton>
                    </Tooltip>
                </Box>
            );
        }
      },
    ],
    [tenantSlug, copiado] // Dependencias del useMemo
  );

  return (
    <CodeplexTabla
      titulo="Sedes Registradas"
      columnas={columnas}
      datos={sedes}
      cargando={cargando}
      habilitarExportacion
      // Acciones estándar de la tabla
      onEditar={(sede) => alEditar(sede)}
      onEliminar={(sede) => manejarEliminar(sede)}
      
      // Configuración visual (igual a TablaReclamos)
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
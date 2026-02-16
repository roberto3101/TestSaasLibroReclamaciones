import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexBoton, CodeplexInsignia, type CodeplexInsigniaColor } from '@codeplex-sac/ui';
import { CodeplexTabla, type MRT_ColumnDef } from '@codeplex-sac/data-view';
import { CodeplexIconoAñadir, CodeplexIconoEditar, CodeplexIconoBorrar } from '@codeplex-sac/icons';
import { Box, Typography, Tooltip, IconButton, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { chatbotsApi } from '../api/chatbots.api';
import { FormChatbot } from '../componentes/FormChatbot';
import type { Chatbot, TipoChatbot } from '@/tipos/chatbot';
import { formatoFechaHora, formatoRelativo } from '@/aplicacion/helpers/formato';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import Swal from 'sweetalert2';

const obtenerColorTipo = (tipo: TipoChatbot): CodeplexInsigniaColor => {
  switch (tipo) {
    case 'ASISTENTE_IA': return 'info';
    case 'WHATSAPP_BOT': return 'exito';
    default: return 'secundario';
  }
};

type FiltroEstado = 'todos' | 'activos' | 'inactivos';

export default function PaginaChatbots() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [chatbotEditar, setChatbotEditar] = useState<Chatbot | null>(null);
  const [filtro, setFiltro] = useState<FiltroEstado>('todos');
  const navigate = useNavigate();

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await chatbotsApi.listar();
      setChatbots(data || []);
    } catch (err) {
      console.error(err);
      setChatbots([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // Filtrar chatbots según el filtro activo
  const chatbotsFiltrados = useMemo(() => {
    if (filtro === 'activos') return chatbots.filter(c => c.activo);
    if (filtro === 'inactivos') return chatbots.filter(c => !c.activo);
    return chatbots;
  }, [chatbots, filtro]);

  const contadores = useMemo(() => ({
    todos: chatbots.length,
    activos: chatbots.filter(c => c.activo).length,
    inactivos: chatbots.filter(c => !c.activo).length,
  }), [chatbots]);

  const alEliminar = async (chatbot: Chatbot) => {
    const result = await Swal.fire({
      title: '¿Eliminar chatbot?',
      html: `<div style="text-align:left;font-size:14px;color:#4b5563;line-height:1.6">
        <p>Se desactivará <strong>${chatbot.nombre}</strong> y se revocarán <strong>todas sus API keys</strong> de forma inmediata.</p>
        <p style="margin-top:8px;padding:8px 12px;background:#fef2f2;border-radius:6px;color:#991b1b;font-size:13px">
          Las integraciones que usen sus keys dejarán de funcionar al instante.
        </p>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;

    try {
      await chatbotsApi.eliminar(chatbot.id);
      notificar.exito('Chatbot eliminado y API keys revocadas');
      cargar();
    } catch (error) {
      manejarError(error);
    }
  };

  const toggleActivo = async (chatbot: Chatbot) => {
    try {
      if (chatbot.activo) {
        const result = await Swal.fire({
          title: '¿Desactivar chatbot?',
          html: `<p style="font-size:14px;color:#4b5563">Se revocarán todas las API keys activas de <strong>${chatbot.nombre}</strong>.</p>`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Desactivar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#d97706',
          cancelButtonColor: '#6b7280',
        });
        if (!result.isConfirmed) return;
        await chatbotsApi.desactivar(chatbot.id);
        notificar.exito('Chatbot desactivado');
      } else {
        await chatbotsApi.reactivar(chatbot.id);
        notificar.exito('Chatbot reactivado — genera nuevas API keys para usarlo');
      }
      cargar();
    } catch (error) {
      manejarError(error);
    }
  };

  const columnas = useMemo<MRT_ColumnDef<Chatbot>[]>(
    () => [
      {
        accessorKey: 'nombre',
        header: 'Chatbot',
        size: 220,
        Cell: ({ row }) => (
          <Box sx={{ opacity: row.original.activo ? 1 : 0.55 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              {row.original.nombre}
            </Typography>
            <Tooltip title={row.original.descripcion || ''}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.3, fontSize: '11px', opacity: 0.8 }}
                noWrap
              >
                {row.original.descripcion || 'Sin descripción'}
              </Typography>
            </Tooltip>
          </Box>
        ),
      },
      {
        accessorKey: 'tipo',
        header: 'Tipo',
        size: 150,
        muiTableBodyCellProps: { align: 'center' },
        muiTableHeadCellProps: { align: 'center' },
        Cell: ({ cell }) => {
          const valor = cell.getValue<TipoChatbot>();
          return (
            <Box sx={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
              <CodeplexInsignia
                contenido={valor ? valor.replace('_', ' ') : 'DESCONOCIDO'}
                color={obtenerColorTipo(valor)}
                variante="estandar"
                superposicion="rectangular"
              />
            </Box>
          );
        }
      },
      {
        accessorKey: 'activo',
        header: 'Estado',
        size: 100,
        muiTableBodyCellProps: { align: 'center' },
        muiTableHeadCellProps: { align: 'center' },
        Cell: ({ cell }) => (
          <Box sx={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
            <CodeplexInsignia
              contenido={cell.getValue<boolean>() ? "ACTIVO" : "INACTIVO"}
              color={cell.getValue<boolean>() ? "exito" : "error"}
              variante="estandar"
              superposicion="rectangular"
            />
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
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', fontSize: '11px' }}>
              {formatoRelativo(cell.getValue<string>())}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'acciones',
        header: 'Acciones',
        size: 200,
        muiTableBodyCellProps: { align: 'right' },
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
            <CodeplexBoton
              texto="Gestionar"
              variante="fantasma"
              tamano="sm"
              alHacerClick={(e) => {
                e.stopPropagation();
                navigate(`/chatbots/${row.original.id}`);
              }}
            />
            <Tooltip title={row.original.activo ? 'Desactivar' : 'Reactivar'}>
              <IconButton
                size="small"
                color={row.original.activo ? 'warning' : 'success'}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleActivo(row.original);
                }}
              >
                {row.original.activo
                  ? <span style={{ fontSize: 16 }}>⏸</span>
                  : <span style={{ fontSize: 16 }}>▶</span>
                }
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar">
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setChatbotEditar(row.original);
                  setMostrarModal(true);
                }}
              >
                <CodeplexIconoEditar sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  alEliminar(row.original);
                }}
              >
                <CodeplexIconoBorrar sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      }
    ],
    [navigate]
  );

  return (
    <CodeplexPila direccion="columna" espaciado={3}>
      <CodeplexPila direccion="fila" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <h2 style={{ margin: 0 }}>Gestión de Chatbots</h2>
        <CodeplexBoton
          texto="Nuevo Chatbot"
          variante="primario"
          iconoIzquierda={<CodeplexIconoAñadir />}
          alHacerClick={() => {
            setChatbotEditar(null);
            setMostrarModal(true);
          }}
        />
      </CodeplexPila>

      {/* Filtro de estado */}
      <Box>
        <ToggleButtonGroup
          value={filtro}
          exclusive
          onChange={(_, val) => val && setFiltro(val as FiltroEstado)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontSize: '13px',
              fontWeight: 600,
              px: 2,
              py: 0.6,
              borderColor: '#e2e8f0',
              '&.Mui-selected': { bgcolor: '#f1f5f9', color: '#1e40af' },
            }
          }}
        >
          <ToggleButton value="todos">Todos ({contadores.todos})</ToggleButton>
          <ToggleButton value="activos">Activos ({contadores.activos})</ToggleButton>
          <ToggleButton value="inactivos">Inactivos ({contadores.inactivos})</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <CodeplexTabla
        titulo="Mis Chatbots"
        columnas={columnas}
        datos={chatbotsFiltrados}
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
          muiTableBodyRowProps: ({ row }) => ({
            sx: {
              cursor: 'pointer',
              transition: 'background-color 0.15s',
              '&:hover': { backgroundColor: '#f8fafc' },
            },
            onClick: () => navigate(`/chatbots/${row.original.id}`),
          }),
          initialState: {
            density: 'compact',
            pagination: { pageSize: 10, pageIndex: 0 },
          },
        }}
      />

      <FormChatbot
        abierto={mostrarModal}
        chatbotEditar={chatbotEditar}
        alCerrar={() => {
          setMostrarModal(false);
          setChatbotEditar(null);
        }}
        alGuardar={() => {
          setMostrarModal(false);
          setChatbotEditar(null);
          cargar();
        }}
      />
    </CodeplexPila>
  );
}
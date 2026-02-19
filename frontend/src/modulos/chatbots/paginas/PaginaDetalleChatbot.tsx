import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexTarjeta, CodeplexBoton, CodeplexCargando, CodeplexInsignia } from '@codeplex-sac/ui';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import type { Chatbot, APIKey } from '@/tipos/chatbot';
import { chatbotsApi } from '../api/chatbots.api';
import { TablaAPIKeys } from '../componentes/TablaAPIKeys';
import { FormAPIKey } from '../componentes/FormAPIKey';
import { PanelProbarAPI } from '../componentes/PanelProbarAPI';
import { PanelDocumentacion } from '../componentes/PanelDocumentacion';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import Swal from 'sweetalert2';

const estiloInsigniaSolida = {
  '& .MuiBadge-badge': {
    position: 'relative',
    transform: 'none',
    top: 'auto', right: 'auto', left: 'auto', bottom: 'auto',
    margin: 0,
  }
};

export default function PaginaDetalleChatbot() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormKey, setMostrarFormKey] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [tab, setTab] = useState(0);

  const cargar = useCallback(async () => {
    if (!id || id === 'undefined') return;
    setCargando(true);
    try {
      const [cb, ks] = await Promise.all([
        chatbotsApi.obtener(id),
        chatbotsApi.listarKeys(id),
      ]);
      setChatbot(cb);
      setKeys(ks || []);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleActivo = async () => {
    if (!chatbot || !id) return;
    if (chatbot.activo) {
      const result = await Swal.fire({
        title: '¿Desactivar chatbot?',
        html: '<p style="font-size:14px;color:#4b5563">Se revocarán <strong>todas las API keys activas</strong>.</p>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Desactivar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d97706',
      });
      if (!result.isConfirmed) return;
    }
    setToggling(true);
    try {
      if (chatbot.activo) {
        await chatbotsApi.desactivar(id);
        notificar.exito('Chatbot desactivado y API keys revocadas');
      } else {
        await chatbotsApi.reactivar(id);
        notificar.exito('Chatbot reactivado — genera nuevas API keys');
      }
      cargar();
    } catch (error) {
      manejarError(error);
    } finally {
      setToggling(false);
    }
  };

  const eliminar = async () => {
    if (!chatbot || !id) return;
    const result = await Swal.fire({
      title: '¿Eliminar chatbot?',
      html: `<p style="font-size:14px;color:#4b5563">Se eliminará <strong>${chatbot.nombre}</strong> y se revocarán todas sus API keys.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!result.isConfirmed) return;
    try {
      await chatbotsApi.eliminar(id);
      notificar.exito('Chatbot eliminado');
      navigate('/chatbots');
    } catch (error) {
      manejarError(error);
    }
  };

  if (cargando) return <CodeplexCargando tipo="anillo" etiqueta="Cargando información..." pantallaCompleta />;
  if (!chatbot) return <Box p={3}>Chatbot no encontrado.</Box>;

  const keysActivas = keys.filter(k => k.activa);
  const keyParaPruebas = keysActivas.length > 0 ? keysActivas[0] : null;

  return (
    <CodeplexPila direccion="columna" espaciado={3}>
      {/* ── Header ── */}
      <CodeplexPila direccion="fila" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h4" fontWeight="bold">{chatbot.nombre}</Typography>
            <CodeplexInsignia
              contenido={chatbot.activo ? "ACTIVO" : "INACTIVO"}
              color={chatbot.activo ? "exito" : "error"}
              variante="estandar"
              superposicion="rectangular"
              sx={estiloInsigniaSolida}
            />
            <CodeplexInsignia
              contenido={chatbot.tipo.replace('_', ' ')}
              color="info"
              variante="estandar"
              superposicion="rectangular"
              sx={estiloInsigniaSolida}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {chatbot.descripcion || 'Sin descripción'} · {keysActivas.length} key{keysActivas.length !== 1 ? 's' : ''} activa{keysActivas.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <CodeplexBoton
            texto={chatbot.activo ? 'Desactivar' : 'Reactivar'}
            variante="contorno"
            tamano="sm"
            estado={toggling ? 'cargando' : 'inactivo'}
            alHacerClick={toggleActivo}
          />
          <CodeplexBoton texto="Eliminar" variante="contorno" tamano="sm" alHacerClick={eliminar} />
          <CodeplexBoton texto="Volver" variante="contorno" tamano="sm" alHacerClick={() => navigate('/chatbots')} />
        </Box>
      </CodeplexPila>

      {/* ── Banner inactivo ── */}
      {!chatbot.activo && (
        <Box sx={{ p: 2, bgcolor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="#92400e">Chatbot desactivado</Typography>
            <Typography variant="body2" color="#a16207" sx={{ fontSize: '13px' }}>
              Reactiva el chatbot y genera nuevas keys para restablecer las integraciones.
            </Typography>
          </Box>
        </Box>
      )}

      {/* ── Tabs ── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '14px' },
          }}
        >
          <Tab label="Probar API" />
          <Tab label="API Keys" />
          <Tab label="Documentación" />
          <Tab label="Detalles" />
        </Tabs>
      </Box>

      {/* ── Tab: Probar API ── */}
      {tab === 0 && (
        <PanelProbarAPI
          chatbot={chatbot}
          apiKey={keyParaPruebas}
          onNecesitaKey={() => { setTab(1); setMostrarFormKey(true); }}
        />
      )}

      {/* ── Tab: API Keys ── */}
      {tab === 1 && (
        <CodeplexTarjeta titulo="Gestión de API Keys">
          <CodeplexPila direccion="columna" espaciado={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="body2" color="text.secondary">
                Genera llaves para integrar este bot con sistemas externos.
              </Typography>
              <CodeplexBoton
                texto="Nueva Key"
                variante="primario"
                tamano="sm"
                alHacerClick={() => {
                  if (!chatbot.activo) { notificar.advertencia('Reactiva el chatbot primero'); return; }
                  setMostrarFormKey(true);
                }}
              />
            </Box>
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <TablaAPIKeys keys={keys} chatbotId={chatbot.id} alRecargar={cargar} />
            </Box>
          </CodeplexPila>
        </CodeplexTarjeta>
      )}

      {/* ── Tab: Documentación ── */}
      {tab === 2 && <PanelDocumentacion chatbot={chatbot} apiKey={keyParaPruebas} />}

      {/* ── Tab: Detalles ── */}
      {tab === 3 && (
        <CodeplexTarjeta titulo="Configuración del Chatbot">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">PERMISOS (SCOPES)</Typography>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {[
                  { key: 'puede_leer_reclamos', label: 'Leer reclamos' },
                  { key: 'puede_responder', label: 'Crear respuestas' },
                  { key: 'puede_cambiar_estado', label: 'Cambiar estado' },
                  { key: 'puede_enviar_mensajes', label: 'Enviar mensajes' },
                  { key: 'puede_leer_metricas', label: 'Leer métricas' },
                ].map(({ key, label }) => (
                  <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: 14 }}>
                      {(chatbot as any)[key] ? '✅' : '❌'}
                    </span>
                    <Typography variant="body2">{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">CONFIGURACIÓN IA</Typography>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Modelo</Typography>
                  <Typography variant="body2" fontWeight={600}>{chatbot.modelo_ia || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Temperatura</Typography>
                  <Typography variant="body2" fontWeight={600}>{chatbot.temperatura && typeof chatbot.temperatura === 'object' 
  ? (chatbot.temperatura as any).Valid ? (chatbot.temperatura as any).Float64 : 'N/A'
  : chatbot.temperatura ?? 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Requiere aprobación</Typography>
                  <Typography variant="body2" fontWeight={600}>{chatbot.requiere_aprobacion ? 'Sí' : 'No'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Máx. respuestas/día</Typography>
                  <Typography variant="body2" fontWeight={600}>{chatbot.max_respuestas_dia || 'Sin límite'}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </CodeplexTarjeta>
      )}

      <FormAPIKey
        abierto={mostrarFormKey}
        chatbotId={chatbot.id}
        alCerrar={() => setMostrarFormKey(false)}
        alCrear={() => { setMostrarFormKey(false); cargar(); }}
      />
    </CodeplexPila>
  );
}
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexTarjeta, CodeplexBoton, CodeplexCargando, CodeplexInsignia } from '@codeplex-sac/ui';
import { Box, Typography, Divider } from '@mui/material';
import type { Chatbot, APIKey } from '@/tipos/chatbot';
import { chatbotsApi } from '../api/chatbots.api';
import { TablaAPIKeys } from '../componentes/TablaAPIKeys';
import { FormAPIKey } from '../componentes/FormAPIKey';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import Swal from 'sweetalert2';

const estiloInsigniaSolida = {
  '& .MuiBadge-badge': {
    position: 'relative',
    transform: 'none',
    top: 'auto',
    right: 'auto',
    left: 'auto',
    bottom: 'auto',
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

  const cargar = async () => {
    if (!id || id === 'undefined') return;
    setCargando(true);
    try {
      const [cb, ks] = await Promise.all([
        chatbotsApi.obtener(id),
        chatbotsApi.listarKeys(id)
      ]);
      setChatbot(cb);
      setKeys(ks || []);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [id]);

  const toggleActivo = async () => {
    if (!chatbot || !id) return;

    if (chatbot.activo) {
      const result = await Swal.fire({
        title: '¿Desactivar chatbot?',
        html: `<p style="font-size:14px;color:#4b5563;line-height:1.6">Se revocarán <strong>todas las API keys activas</strong> de este chatbot. Las integraciones dejarán de funcionar.</p>`,
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
      html: `<div style="text-align:left;font-size:14px;color:#4b5563;line-height:1.6">
        <p>Se eliminará <strong>${chatbot.nombre}</strong> y se revocarán todas sus API keys.</p>
        <p style="margin-top:8px;padding:8px 12px;background:#fef2f2;border-radius:6px;color:#991b1b;font-size:13px">
          Esta acción no se puede deshacer fácilmente.
        </p>
      </div>`,
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

  const keysActivas = (keys || []).filter(k => k.activa).length;

  return (
    <CodeplexPila direccion="columna" espaciado={3}>
      {/* Header */}
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
          </Box>
          <Typography variant="body2" color="text.secondary" fontFamily="monospace" sx={{ mt: 0.5 }}>
            ID: {chatbot.id}
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
          <CodeplexBoton
            texto="Eliminar"
            variante="contorno"
            tamano="sm"
            alHacerClick={eliminar}
          />
          <CodeplexBoton texto="Volver" variante="contorno" tamano="sm" alHacerClick={() => navigate('/chatbots')} />
        </Box>
      </CodeplexPila>

      {/* Banner de inactivo */}
      {!chatbot.activo && (
        <Box sx={{
          p: 2,
          bgcolor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="#92400e">
              Chatbot desactivado
            </Typography>
            <Typography variant="body2" color="#a16207" sx={{ fontSize: '13px' }}>
              Todas las API keys fueron revocadas. Reactiva el chatbot y genera nuevas keys para restablecer las integraciones.
            </Typography>
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>

        {/* Detalles */}
        <Box sx={{ width: { xs: '100%', md: '350px' }, flexShrink: 0 }}>
          <CodeplexTarjeta titulo="Detalles Generales">
            <CodeplexPila direccion="columna" espaciado={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">TIPO DE BOT</Typography>
                <Box mt={0.5}>
                  <CodeplexInsignia
                    contenido={chatbot.tipo.replace('_', ' ')}
                    color="info"
                    variante="estandar"
                    superposicion="rectangular"
                    sx={estiloInsigniaSolida}
                  />
                </Box>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">DESCRIPCIÓN</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>{chatbot.descripcion || 'Sin descripción'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">MODELO IA</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }}>{chatbot.modelo_ia || 'N/A'}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">API KEYS</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  <strong>{keysActivas}</strong> activa{keysActivas !== 1 ? 's' : ''} de {(keys || []).length} total
                </Typography>
              </Box>
            </CodeplexPila>
          </CodeplexTarjeta>
        </Box>

        {/* API Keys */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <CodeplexTarjeta titulo="Seguridad y API Keys">
            <CodeplexPila direccion="columna" espaciado={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Typography variant="body2" color="text.secondary">
                  Gestiona las llaves de acceso para integrar este bot.
                </Typography>
                <CodeplexBoton
                  texto="Nueva Key"
                  variante="primario"
                  tamano="sm"
                  alHacerClick={() => {
                    if (!chatbot.activo) {
                      notificar.advertencia('Reactiva el chatbot antes de generar nuevas keys');
                      return;
                    }
                    setMostrarFormKey(true);
                  }}
                />
              </Box>

              <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <TablaAPIKeys
                  keys={keys || []}
                  chatbotId={chatbot.id}
                  alRecargar={cargar}
                />
              </Box>
            </CodeplexPila>
          </CodeplexTarjeta>
        </Box>
      </Box>

      <FormAPIKey
        abierto={mostrarFormKey}
        chatbotId={chatbot.id}
        alCerrar={() => setMostrarFormKey(false)}
        alCrear={() => { setMostrarFormKey(false); cargar(); }}
      />
    </CodeplexPila>
  );
}
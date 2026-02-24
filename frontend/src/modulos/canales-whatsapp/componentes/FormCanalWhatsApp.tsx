import { useState, useEffect } from 'react';
import { CodeplexModal } from '@codeplex-sac/utils';
import { CodeplexCampoTexto, CodeplexBoton, CodeplexAlerta } from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import { Box, Typography, Switch, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { canalesWhatsAppApi } from '../api/canales-whatsapp.api';
import { chatbotsApi } from '../../chatbots/api/chatbots.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import type { CanalWhatsApp } from '@/tipos/canal-whatsapp';
import type { Chatbot } from '@/tipos/chatbot';

interface Props {
  abierto: boolean;
  canalEditar?: CanalWhatsApp | null;
  alCerrar: () => void;
  alGuardar: () => void;
}

export function FormCanalWhatsApp({ abierto, canalEditar, alCerrar, alGuardar }: Props) {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [nombreCanal, setNombreCanal] = useState('');
  const [chatbotId, setChatbotId] = useState<string>('');
  const [activo, setActivo] = useState(true);
  const [cargando, setCargando] = useState(false);

  // Lista de chatbots disponibles para vincular
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [cargandoChatbots, setCargandoChatbots] = useState(false);

  const esEdicion = !!canalEditar;

  // Cargar chatbots del tenant al abrir el modal
  useEffect(() => {
    if (!abierto) return;
    setCargandoChatbots(true);
    chatbotsApi.listar()
      .then((data) => setChatbots((data || []).filter((c) => c.activo)))
      .catch(() => setChatbots([]))
      .finally(() => setCargandoChatbots(false));
  }, [abierto]);

  useEffect(() => {
    if (canalEditar) {
      setPhoneNumberId(canalEditar.phone_number_id);
      setDisplayPhone(canalEditar.display_phone || '');
      setAccessToken('');
      setVerifyToken('');
      setNombreCanal(canalEditar.nombre_canal);
      setChatbotId(canalEditar.chatbot_id || '');
      setActivo(canalEditar.activo);
    } else {
      setPhoneNumberId('');
      setDisplayPhone('');
      setAccessToken('');
      setVerifyToken('');
      setNombreCanal('');
      setChatbotId('');
      setActivo(true);
    }
  }, [canalEditar, abierto]);

  const guardar = async () => {
    if (!phoneNumberId.trim()) return notificar.advertencia('El Phone Number ID es obligatorio');
   if (!esEdicion && !accessToken.trim()) return notificar.advertencia('El Access Token es obligatorio');

    setCargando(true);
    try {
      const chatbotIdValue = chatbotId || null;

      if (esEdicion && canalEditar) {
        await canalesWhatsAppApi.actualizar(canalEditar.id, {
          phone_number_id: phoneNumberId.trim(),
          display_phone: displayPhone.trim(),
          access_token: accessToken.trim(),
          verify_token: verifyToken.trim(),
          nombre_canal: nombreCanal.trim() || 'WhatsApp Principal',
          chatbot_id: chatbotIdValue,
          activo,
        });
        notificar.exito('Canal WhatsApp actualizado');
      } else {
        await canalesWhatsAppApi.crear({
          phone_number_id: phoneNumberId.trim(),
          display_phone: displayPhone.trim(),
          access_token: accessToken.trim(),
          verify_token: verifyToken.trim(),
          nombre_canal: nombreCanal.trim() || 'WhatsApp Principal',
          chatbot_id: chatbotIdValue,
        });
        notificar.exito('Canal WhatsApp creado exitosamente');
      }
      alGuardar();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <CodeplexModal
      open={abierto}
      onClose={alCerrar}
      title={esEdicion ? 'Editar Canal WhatsApp' : 'Nuevo Canal WhatsApp'}
      maxWidth="sm"
      footer={
        <CodeplexPila direccion="fila" espaciado={1} sx={{ justifyContent: 'flex-end' }}>
          <CodeplexBoton texto="Cancelar" variante="contorno" alHacerClick={alCerrar} />
          <CodeplexBoton
            texto={esEdicion ? 'Guardar Cambios' : 'Crear Canal'}
            variante="primario"
            estado={cargando ? 'cargando' : 'inactivo'}
            alHacerClick={guardar}
          />
        </CodeplexPila>
      }
    >
      <CodeplexPila direccion="columna" espaciado={2}>
        <CodeplexAlerta
          variante="info"
          titulo="¿Dónde encuentro estos datos?"
          descripcion="Ingresa a Meta for Developers → Tu App → WhatsApp → API Setup. Ahí encontrarás el Phone Number ID y el Access Token."
        />

        <CodeplexCampoTexto
          etiqueta="Phone Number ID *"
          valor={phoneNumberId}
          alCambiar={(e) => setPhoneNumberId(e.target.value)}
          marcador="Ej: 1016419754888111"
          textoAyuda="ID del número en Meta (no es el teléfono, es el identificador)"
          anchoCompleto
        />

        <CodeplexCampoTexto
          etiqueta="Número visible"
          valor={displayPhone}
          alCambiar={(e) => setDisplayPhone(e.target.value)}
          marcador="Ej: +51 999 888 777"
          textoAyuda="Teléfono para mostrar en el panel (solo referencia)"
          anchoCompleto
        />

        <CodeplexCampoTexto
          etiqueta={esEdicion ? "Access Token (dejar vacío para mantener el actual)" : "Access Token *"}
          valor={accessToken}
          alCambiar={(e) => setAccessToken(e.target.value)}
          marcador={esEdicion ? 'Dejar vacío para mantener el token actual' : 'Pega aquí el token de Meta'}
          textoAyuda={esEdicion ? "Solo llena este campo si quieres cambiar el token. Si lo dejas vacío, se mantiene el actual." : "Token temporal (24h) o permanente de Meta Business"}
          anchoCompleto
        />

        <CodeplexCampoTexto
          etiqueta="Verify Token"
          valor={verifyToken}
          alCambiar={(e) => setVerifyToken(e.target.value)}
          marcador="Ej: libro_reclamos_2026"
          textoAyuda="Token de verificación del webhook (opcional si usas el global)"
          anchoCompleto
        />

        <CodeplexCampoTexto
          etiqueta="Nombre del canal"
          valor={nombreCanal}
          alCambiar={(e) => setNombreCanal(e.target.value)}
          marcador="Ej: WhatsApp Principal"
          textoAyuda="Nombre descriptivo para identificar este número"
          anchoCompleto
        />

        {/* ── Selector de Chatbot vinculado ── */}
        <Box sx={{
          p: 2, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd',
        }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, color: '#0c4a6e' }}>
            Chatbot vinculado (IA)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontSize: '11px' }}>
            Selecciona el chatbot que definirá el prompt, modelo de IA y comportamiento de este canal.
            Si no seleccionas ninguno, se usará la configuración por defecto.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="chatbot-select-label">Chatbot</InputLabel>
            <Select
              labelId="chatbot-select-label"
              value={chatbotId}
              label="Chatbot"
              onChange={(e) => setChatbotId(e.target.value)}
              disabled={cargandoChatbots}
              sx={{ bgcolor: '#fff' }}
            >
              <MenuItem value="">
                <em>Sin chatbot (usar config por defecto)</em>
              </MenuItem>
              {chatbots.map((cb) => (
                <MenuItem key={cb.id} value={cb.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box component="span" sx={{
                      px: 0.6, py: 0.1, borderRadius: 0.5, fontSize: '9px', fontWeight: 700,
                      bgcolor: cb.tipo === 'WHATSAPP_BOT' ? '#dcfce7' : '#dbeafe',
                      color: cb.tipo === 'WHATSAPP_BOT' ? '#166534' : '#1e40af',
                    }}>
                      {cb.tipo.replace('_', ' ')}
                    </Box>
                    <span>{cb.nombre}</span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {chatbots.length === 0 && !cargandoChatbots && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#d97706', fontSize: '11px' }}>
              No tienes chatbots activos. Crea uno en Gestión de Chatbots para vincular.
            </Typography>
          )}
        </Box>

        {esEdicion && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.2,
              bgcolor: activo ? '#f0fdf4' : '#fef2f2',
              borderRadius: 2,
              border: `1px solid ${activo ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ color: activo ? '#166534' : '#991b1b' }}>
                {activo ? 'Canal activo' : 'Canal desactivado'}
              </Typography>
              <Typography variant="caption" sx={{ color: activo ? '#15803d' : '#b91c1c', fontSize: '11px' }}>
                {activo
                  ? 'Este número está recibiendo mensajes de WhatsApp.'
                  : 'Los mensajes a este número serán ignorados.'}
              </Typography>
            </Box>
            <Switch
              checked={activo}
              onChange={() => setActivo(!activo)}
              size="small"
              color={activo ? 'success' : 'error'}
            />
          </Box>
        )}
      </CodeplexPila>
    </CodeplexModal>
  );
}
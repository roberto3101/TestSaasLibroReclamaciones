import { useState, useEffect } from 'react';
import { CodeplexModal } from '@codeplex-sac/utils';
import { CodeplexCampoTexto, CodeplexBoton, CodeplexAlerta } from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import { Box, Typography, Switch } from '@mui/material';
import { canalesWhatsAppApi } from '../api/canales-whatsapp.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import type { CanalWhatsApp } from '@/tipos/canal-whatsapp';

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
  const [activo, setActivo] = useState(true);
  const [cargando, setCargando] = useState(false);

  const esEdicion = !!canalEditar;

  useEffect(() => {
    if (canalEditar) {
      setPhoneNumberId(canalEditar.phone_number_id);
      setDisplayPhone(canalEditar.display_phone || '');
      setAccessToken(''); // No viene del backend por seguridad
      setVerifyToken('');
      setNombreCanal(canalEditar.nombre_canal);
      setActivo(canalEditar.activo);
    } else {
      setPhoneNumberId('');
      setDisplayPhone('');
      setAccessToken('');
      setVerifyToken('');
      setNombreCanal('');
      setActivo(true);
    }
  }, [canalEditar, abierto]);

  const guardar = async () => {
    if (!phoneNumberId.trim()) return notificar.advertencia('El Phone Number ID es obligatorio');
    if (!accessToken.trim()) return notificar.advertencia('El Access Token es obligatorio');

    setCargando(true);
    try {
      if (esEdicion && canalEditar) {
        await canalesWhatsAppApi.actualizar(canalEditar.id, {
          phone_number_id: phoneNumberId.trim(),
          display_phone: displayPhone.trim(),
          access_token: accessToken.trim(),
          verify_token: verifyToken.trim(),
          nombre_canal: nombreCanal.trim() || 'WhatsApp Principal',
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
          etiqueta="Access Token *"
          valor={accessToken}
          alCambiar={(e) => setAccessToken(e.target.value)}
          marcador={esEdicion ? 'Ingresa el nuevo token (el anterior no se muestra por seguridad)' : 'Pega aquí el token de Meta'}
          textoAyuda="Token temporal (24h) o permanente de Meta Business"
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
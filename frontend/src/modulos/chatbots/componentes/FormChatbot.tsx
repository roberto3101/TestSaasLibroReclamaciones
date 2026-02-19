import { useState, useEffect } from 'react';
import { CodeplexModal } from '@codeplex-sac/utils';
import { 
  CodeplexCampoTexto, 
  CodeplexSelector, 
  CodeplexBoton, 
  CodeplexAlerta 
} from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import { Box, Typography, Switch, Divider } from '@mui/material';
import { chatbotsApi } from '../api/chatbots.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import type { Chatbot, TipoChatbot } from '@/tipos/chatbot';
import type { SelectChangeEvent } from '@mui/material/Select';

interface Props {
  abierto: boolean;
  chatbotEditar?: Chatbot | null; 
  alCerrar: () => void;
  alGuardar: () => void;
}

const TIPOS: { valor: TipoChatbot; etiqueta: string }[] = [
  { valor: 'ASISTENTE_IA', etiqueta: 'Asistente IA (GPT/Claude)' },
  { valor: 'WHATSAPP_BOT', etiqueta: 'WhatsApp Bot' },
  { valor: 'CUSTOM', etiqueta: 'Integración Personalizada' },
];

const PERMISOS = [
  { 
    key: 'puede_leer_reclamos', 
    label: 'Leer reclamos', 
    desc: 'Puede consultar la lista y detalle de reclamos',
  },
  { 
    key: 'puede_responder', 
    label: 'Crear respuestas', 
    desc: 'Puede generar respuestas oficiales a reclamos',
  },
  { 
    key: 'puede_cambiar_estado', 
    label: 'Cambiar estado', 
    desc: 'Puede cambiar el estado de un reclamo (Pendiente → En Proceso → Resuelto)',
  },
  { 
    key: 'puede_enviar_mensajes', 
    label: 'Enviar mensajes', 
    desc: 'Puede enviar mensajes de seguimiento al consumidor',
  },
  { 
    key: 'puede_leer_metricas', 
    label: 'Leer métricas', 
    desc: 'Puede acceder a estadísticas y reportes del tenant',
  },
];

export function FormChatbot({ abierto, chatbotEditar, alCerrar, alGuardar }: Props) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoChatbot>('ASISTENTE_IA');
  const [descripcion, setDescripcion] = useState('');
  
  // Campos avanzados IA
  const [modelIA, setModelIA] = useState('gpt-4o');
  const [prompt, setPrompt] = useState('Eres un asistente útil de atención al cliente.');

  // Permisos (scopes)
  const [permisos, setPermisos] = useState<Record<string, boolean>>({
    puede_leer_reclamos: true,
    puede_responder: false,
    puede_cambiar_estado: false,
    puede_enviar_mensajes: true,
    puede_leer_metricas: false,
  });

  // Reglas de negocio
  const [requiereAprobacion, setRequiereAprobacion] = useState(false);

  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (chatbotEditar) {
      setNombre(chatbotEditar.nombre);
      setTipo(chatbotEditar.tipo);
      setDescripcion(chatbotEditar.descripcion || '');
      setModelIA(chatbotEditar.modelo_ia || 'gpt-4o');
      setPrompt(chatbotEditar.prompt_sistema || '');
      setRequiereAprobacion(chatbotEditar.requiere_aprobacion || false);
      setPermisos({
        puede_leer_reclamos: chatbotEditar.puede_leer_reclamos ?? true,
        puede_responder: chatbotEditar.puede_responder ?? false,
        puede_cambiar_estado: chatbotEditar.puede_cambiar_estado ?? false,
        puede_enviar_mensajes: chatbotEditar.puede_enviar_mensajes ?? true,
        puede_leer_metricas: chatbotEditar.puede_leer_metricas ?? false,
      });
    } else {
      setNombre('');
      setTipo('ASISTENTE_IA');
      setDescripcion('');
      setModelIA('gpt-4o');
      setPrompt('Eres un asistente útil de atención al cliente.');
      setRequiereAprobacion(false);
      setPermisos({
        puede_leer_reclamos: true,
        puede_responder: false,
        puede_cambiar_estado: false,
        puede_enviar_mensajes: true,
        puede_leer_metricas: false,
      });
    }
  }, [chatbotEditar, abierto]);

  const togglePermiso = (key: string) => {
    setPermisos(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const guardar = async () => {
    if (!nombre.trim()) return notificar.advertencia('El nombre es obligatorio');
    
    setCargando(true);
    try {
      const payload = {
        nombre,
        tipo,
        descripcion,
        modelo_ia: tipo === 'ASISTENTE_IA' ? modelIA : undefined,
        prompt_sistema: tipo === 'ASISTENTE_IA' ? prompt : undefined,
        // Permisos
        puede_leer_reclamos: permisos.puede_leer_reclamos,
        puede_responder: permisos.puede_responder,
        puede_cambiar_estado: permisos.puede_cambiar_estado,
        puede_enviar_mensajes: permisos.puede_enviar_mensajes,
        puede_leer_metricas: permisos.puede_leer_metricas,
        // Reglas
        requiere_aprobacion: requiereAprobacion,
      };

      if (chatbotEditar) {
        await chatbotsApi.actualizar(chatbotEditar.id, payload);
        notificar.exito('Chatbot actualizado');
      } else {
        await chatbotsApi.crear(payload);
        notificar.exito('Chatbot creado exitosamente');
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
      title={chatbotEditar ? "Editar Chatbot" : "Nuevo Chatbot"} 
      maxWidth="md"
      footer={
        <CodeplexPila direccion="fila" espaciado={1} sx={{ justifyContent: 'flex-end' }}>
          <CodeplexBoton texto="Cancelar" variante="contorno" alHacerClick={alCerrar} />
          <CodeplexBoton 
            texto={chatbotEditar ? "Guardar Cambios" : "Crear Chatbot"} 
            variante="primario" 
            estado={cargando ? 'cargando' : 'inactivo'} 
            alHacerClick={guardar} 
          />
        </CodeplexPila>
      }
    >
      <CodeplexPila direccion="columna" espaciado={2}>
        {/* ── Info básica ── */}
        <CodeplexPila direccion="fila" espaciado={2}>
          <CodeplexCampoTexto 
            etiqueta="Nombre *" 
            valor={nombre} 
            alCambiar={(e) => setNombre(e.target.value)} 
            anchoCompleto 
          />
          <CodeplexSelector 
            etiqueta="Tipo *" 
            opciones={TIPOS} 
            value={tipo} 
            alCambiar={(e: SelectChangeEvent<unknown>) => setTipo(e.target.value as TipoChatbot)} 
          />
        </CodeplexPila>

        <CodeplexCampoTexto 
          etiqueta="Descripción" 
          valor={descripcion} 
          alCambiar={(e) => setDescripcion(e.target.value)} 
          multilinea 
          filas={2} 
        />

        {/* ── Permisos ── */}
        <Divider />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            Permisos del Bot
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Define qué puede hacer este chatbot con tu sistema de reclamos.
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'flex', flexDirection: 'column', gap: 0,
          bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', overflow: 'hidden',
        }}>
          {PERMISOS.map((p, i) => (
            <Box
              key={p.key}
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                px: 2, py: 1.2,
                borderBottom: i < PERMISOS.length - 1 ? '1px solid #e2e8f0' : 'none',
                '&:hover': { bgcolor: '#f1f5f9' },
                transition: 'background 0.15s',
              }}
            >
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#1e293b' }}>
                  {p.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                  {p.desc}
                </Typography>
              </Box>
              <Switch
                checked={permisos[p.key] || false}
                onChange={() => togglePermiso(p.key)}
                size="small"
                color="primary"
              />
            </Box>
          ))}
        </Box>

        {/* ── Regla: Requiere aprobación ── */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.2, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fde68a',
        }}>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ color: '#92400e' }}>
              Requiere aprobación humana
            </Typography>
            <Typography variant="caption" sx={{ color: '#a16207', fontSize: '11px' }}>
              Si está activo, las respuestas del bot quedan en borrador hasta que un admin las apruebe.
            </Typography>
          </Box>
          <Switch
            checked={requiereAprobacion}
            onChange={() => setRequiereAprobacion(!requiereAprobacion)}
            size="small"
            color="warning"
          />
        </Box>

        {/* ── Config IA (solo para ASISTENTE_IA) ── */}
        {tipo === 'ASISTENTE_IA' && (
          <>
            <Divider />
            <CodeplexPila direccion="columna" espaciado={2} sx={{ p: 2, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
              <CodeplexAlerta variante="info" titulo="Configuración de IA" />
              <CodeplexCampoTexto 
                etiqueta="Prompt del Sistema (Instrucciones base)" 
                valor={prompt} 
                alCambiar={(e) => setPrompt(e.target.value)} 
                multilinea 
                filas={4} 
                textoAyuda="Define la personalidad y reglas del bot."
              />
              <CodeplexCampoTexto 
                etiqueta="Modelo (ej: gpt-4o, claude-3-5-sonnet)" 
                valor={modelIA} 
                alCambiar={(e) => setModelIA(e.target.value)} 
              />
            </CodeplexPila>
          </>
        )}
      </CodeplexPila>
    </CodeplexModal>
  );
}
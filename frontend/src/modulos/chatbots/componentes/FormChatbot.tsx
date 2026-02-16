import { useState, useEffect } from 'react';
import { CodeplexModal } from '@codeplex-sac/utils';
import { 
  CodeplexCampoTexto, 
  CodeplexSelector, 
  CodeplexBoton, 
  CodeplexAlerta 
} from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import { chatbotsApi } from '../api/chatbots.api'; // Import relativo corregido
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

export function FormChatbot({ abierto, chatbotEditar, alCerrar, alGuardar }: Props) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoChatbot>('ASISTENTE_IA');
  const [descripcion, setDescripcion] = useState('');
  
  // Campos avanzados IA
  const [modelIA, setModelIA] = useState('gpt-4o');
  const [prompt, setPrompt] = useState('Eres un asistente útil de atención al cliente.');

  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (chatbotEditar) {
      setNombre(chatbotEditar.nombre);
      setTipo(chatbotEditar.tipo);
      setDescripcion(chatbotEditar.descripcion || '');
      setModelIA(chatbotEditar.modelo_ia || 'gpt-4o');
      setPrompt(chatbotEditar.prompt_sistema || '');
    } else {
      setNombre('');
      setTipo('ASISTENTE_IA');
      setDescripcion('');
      setModelIA('gpt-4o');
      setPrompt('Eres un asistente útil...');
    }
  }, [chatbotEditar, abierto]);

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

        {tipo === 'ASISTENTE_IA' && (
          <CodeplexPila direccion="columna" espaciado={2} sx={{ mt: 1, p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
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
        )}
      </CodeplexPila>
    </CodeplexModal>
  );
}
import { useState, useRef, useEffect, useCallback } from 'react';
import { assistantApi } from '../api/assistant.api';
import type { ConversacionResumen, MensajeHistorial, MensajeUI } from '@/tipos';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import {
  SidebarConversaciones,
  CabeceraChat,
  BurbujaMensaje,
  EstadoVacio,
  IndicadorEscribiendo,
  EntradaMensaje,
} from '../componentes';

// ──────────────────────────────────────────────────────────────────────────────
// Hook: detecta si es móvil
// ──────────────────────────────────────────────────────────────────────────────

function useEsMovil(breakpoint = 768) {
  const [esMovil, setEsMovil] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setEsMovil(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return esMovil;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: convierte mensaje de BD al formato UI
// ──────────────────────────────────────────────────────────────────────────────

function mensajeDBaUI(m: MensajeHistorial): MensajeUI {
  return {
    id: m.id,
    role: m.rol === 'USER' ? 'user' : 'assistant',
    content: m.contenido,
    timestamp: new Date(m.fecha_creacion),
    tokens:
      m.tokens_prompt || m.tokens_output
        ? { prompt: m.tokens_prompt, output: m.tokens_output }
        : undefined,
    provider: m.proveedor || undefined,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────────────────

export default function PaginaAsistente() {
  const esMovil = useEsMovil();
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(null);
  const [cargandoConversaciones, setCargandoConversaciones] = useState(true);
  const [mensajes, setMensajes] = useState<MensajeUI[]>([]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [sidebarAbierto, setSidebarAbierto] = useState(!esMovil);
  const chatRef = useRef<HTMLDivElement>(null);

  // Cerrar sidebar automáticamente al cambiar a móvil
  useEffect(() => {
    setSidebarAbierto(!esMovil);
  }, [esMovil]);

  // --- Carga inicial ---
  const cargarConversaciones = useCallback(async () => {
    try {
      setCargandoConversaciones(true);
      const lista = await assistantApi.listarConversaciones();
      setConversaciones(lista);
    } catch (err) {
      console.error('Error cargando conversaciones:', err);
    } finally {
      setCargandoConversaciones(false);
    }
  }, []);

  useEffect(() => {
    cargarConversaciones();
  }, [cargarConversaciones]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensajes]);

  // --- Seleccionar conversación ---
  const seleccionarConversacion = useCallback(
    async (convId: string) => {
      if (convId === conversacionActiva) return;
      setConversacionActiva(convId);
      setMensajes([]);
      setCargandoMensajes(true);
      if (esMovil) setSidebarAbierto(false);
      try {
        const msgs = await assistantApi.obtenerMensajes(convId);
        setMensajes(msgs.map(mensajeDBaUI));
      } catch (err) {
        manejarError(err);
      } finally {
        setCargandoMensajes(false);
      }
    },
    [conversacionActiva, esMovil],
  );

  // --- Nueva conversación ---
  const nuevaConversacion = useCallback(() => {
    setConversacionActiva(null);
    setMensajes([]);
    setInput('');
    if (esMovil) setSidebarAbierto(false);
  }, [esMovil]);

  // --- Eliminar conversación ---
  const eliminarConversacion = useCallback(
    async (convId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await assistantApi.eliminarConversacion(convId);
        if (conversacionActiva === convId) {
          setConversacionActiva(null);
          setMensajes([]);
        }
        notificar.exito('Conversación eliminada');
        await cargarConversaciones();
      } catch (err) {
        manejarError(err);
      }
    },
    [conversacionActiva, cargarConversaciones],
  );

  // --- Enviar mensaje ---
  const enviarMensaje = useCallback(async () => {
    const texto = input.trim();
    if (!texto || cargando) return;

    const userMsg: MensajeUI = {
      id: crypto.randomUUID(),
      role: 'user',
      content: texto,
      timestamp: new Date(),
    };

    setMensajes((prev) => [...prev, userMsg]);
    setInput('');
    setCargando(true);

    try {
      const resp = await assistantApi.chat(texto, conversacionActiva ?? undefined);

      if (!conversacionActiva && resp.conversacion_id) {
        setConversacionActiva(resp.conversacion_id);
        await cargarConversaciones();
      }

      setMensajes((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: resp.response,
          timestamp: new Date(),
          tokens: { prompt: resp.prompt_tokens, output: resp.output_tokens },
          provider: resp.provider,
        },
      ]);
    } catch (error: any) {
      manejarError(error);
      setMensajes((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            error?.response?.data?.detalle ??
            'No pude procesar tu mensaje. Verifica que AI_PROVIDER, AI_API_KEY y AI_MODEL estén configurados.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setCargando(false);
    }
  }, [input, cargando, conversacionActiva, cargarConversaciones]);

  // --- Datos derivados ---
  const totalTokens = mensajes.reduce(
    (acc, m) => acc + (m.tokens?.prompt ?? 0) + (m.tokens?.output ?? 0),
    0,
  );
  const tituloActivo = conversaciones.find((c) => c.id === conversacionActiva)?.titulo;

  // --- Render ---
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', overflow: 'hidden', position: 'relative' }}>
      {/* Overlay en móvil cuando sidebar está abierto */}
      {esMovil && sidebarAbierto && (
        <div
          onClick={() => setSidebarAbierto(false)}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 10,
          }}
        />
      )}

      <SidebarConversaciones
        conversaciones={conversaciones}
        conversacionActiva={conversacionActiva}
        cargando={cargandoConversaciones}
        abierto={sidebarAbierto}
        esMovil={esMovil}
        onSeleccionar={seleccionarConversacion}
        onNueva={nuevaConversacion}
        onEliminar={eliminarConversacion}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <CabeceraChat
          titulo={tituloActivo}
          totalTokens={totalTokens}
          sidebarAbierto={sidebarAbierto}
          esMovil={esMovil}
          onToggleSidebar={() => setSidebarAbierto((v) => !v)}
          onNuevaConversacion={nuevaConversacion}
        />

        <div
          ref={chatRef}
          style={{ flex: 1, overflowY: 'auto', padding: esMovil ? '12px 12px' : '20px 24px', backgroundColor: '#f9fafb' }}
        >
          {cargandoMensajes ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
              }}
            >
              Cargando mensajes...
            </div>
          ) : mensajes.length === 0 ? (
            <EstadoVacio onSugerencia={(s) => setInput(s)} esMovil={esMovil} />
          ) : (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              {mensajes.map((m) => (
                <BurbujaMensaje key={m.id} mensaje={m} />
              ))}
              {cargando && <IndicadorEscribiendo />}
            </div>
          )}
        </div>

        <EntradaMensaje
          input={input}
          cargando={cargando}
          esMovil={esMovil}
          onInputChange={setInput}
          onEnviar={enviarMensaje}
        />
      </div>
    </div>
  );
}
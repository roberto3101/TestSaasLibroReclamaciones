import { useState } from 'react';
import { CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexTarjeta, CodeplexBoton, CodeplexCampoTexto, CodeplexAlerta } from '@codeplex-sac/ui';
import { Box, Typography, Tooltip } from '@mui/material';
import type { Chatbot, APIKey } from '@/tipos/chatbot';

// ──────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────

interface Endpoint {
  id: string;
  metodo: 'GET' | 'POST' | 'PATCH';
  ruta: string;
  nombre: string;
  descripcion: string;
  scope: string;
  tieneBody: boolean;
  tieneParam: boolean;
  bodyEjemplo?: string;
}

interface ReclamoResumen {
  id: string;
  codigo: string;
  cliente_nombre?: string;
  detalle?: string;
  estado?: string;
}

interface Props {
  chatbot: Chatbot;
  apiKey: APIKey | null;
  onNecesitaKey: () => void;
}

// ──────────────────────────────────────────────────────────────────
// Endpoints
// ──────────────────────────────────────────────────────────────────

const ENDPOINTS: Endpoint[] = [
  {
    id: 'listar',
    metodo: 'GET',
    ruta: '/api/bot/v1/reclamos',
    nombre: 'Listar Reclamos',
    descripcion: 'Obtiene todos los reclamos del tenant. Ejecuta este primero para seleccionar un reclamo.',
    scope: 'puede_leer_reclamos',
    tieneBody: false,
    tieneParam: false,
  },
  {
    id: 'detalle',
    metodo: 'GET',
    ruta: '/api/bot/v1/reclamos/:id',
    nombre: 'Detalle de Reclamo',
    descripcion: 'Obtiene la información completa de un reclamo.',
    scope: 'puede_leer_reclamos',
    tieneBody: false,
    tieneParam: true,
  },
  {
    id: 'mensaje',
    metodo: 'POST',
    ruta: '/api/bot/v1/reclamos/:id/mensajes',
    nombre: 'Enviar Mensaje',
    descripcion: 'Envía un mensaje de seguimiento a un reclamo.',
    scope: 'puede_enviar_mensajes',
    tieneBody: true,
    tieneParam: true,
    bodyEjemplo: JSON.stringify({
      tipo_mensaje: 'EMPRESA',
      mensaje: 'Hemos recibido su reclamo y estamos trabajando en una solución.',
    }, null, 2),
  },
  {
    id: 'estado',
    metodo: 'PATCH',
    ruta: '/api/bot/v1/reclamos/:id/estado',
    nombre: 'Cambiar Estado',
    descripcion: 'Cambia el estado de un reclamo (PENDIENTE → EN_PROCESO → RESUELTO).',
    scope: 'puede_cambiar_estado',
    tieneBody: true,
    tieneParam: true,
    bodyEjemplo: JSON.stringify({
      estado: 'EN_PROCESO',
      comentario: 'Caso en revisión por el equipo de soporte.',
    }, null, 2),
  },
];

const COLORES_METODO: Record<string, { bg: string; color: string }> = {
  GET: { bg: '#dcfce7', color: '#166534' },
  POST: { bg: '#dbeafe', color: '#1e40af' },
  PATCH: { bg: '#fef3c7', color: '#92400e' },
  DELETE: { bg: '#fee2e2', color: '#991b1b' },
};

const COLORES_ESTADO: Record<string, { bg: string; color: string }> = {
  PENDIENTE: { bg: '#fef3c7', color: '#92400e' },
  EN_PROCESO: { bg: '#dbeafe', color: '#1e40af' },
  RESUELTO: { bg: '#dcfce7', color: '#166534' },
  CERRADO: { bg: '#f3f4f6', color: '#6b7280' },
};

// ──────────────────────────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────────────────────────

export function PanelProbarAPI({ chatbot, apiKey, onNecesitaKey }: Props) {
  const [endpointActivo, setEndpointActivo] = useState<Endpoint>(ENDPOINTS[0]);
  const [reclamoId, setReclamoId] = useState('');
  const [body, setBody] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [respuesta, setRespuesta] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [duracion, setDuracion] = useState<number | null>(null);

  // Lista de reclamos obtenida del endpoint Listar
  const [reclamos, setReclamos] = useState<ReclamoResumen[]>([]);
  const [reclamoSeleccionado, setReclamoSeleccionado] = useState<ReclamoResumen | null>(null);

  const seleccionarEndpoint = (ep: Endpoint) => {
    setEndpointActivo(ep);
    setBody(ep.bodyEjemplo || '');
    setRespuesta(null);
    setStatusCode(null);
    setDuracion(null);
  };

  const seleccionarReclamo = (r: ReclamoResumen) => {
    setReclamoSeleccionado(r);
    setReclamoId(r.id);
  };

  const scopeHabilitado = (chatbot as any)[endpointActivo.scope] === true;

  // Extrae reclamos de la respuesta de Listar Reclamos
  // Soporta: { data: { data: [...] } }, { data: [...] }, [...]
  const extraerReclamos = (data: any): ReclamoResumen[] => {
    try {
      let lista: any[] = [];

      // Caso: { success: true, data: { data: [...] } } (doble anidado)
      if (Array.isArray(data?.data?.data)) lista = data.data.data;
      // Caso: { data: [...] }
      else if (Array.isArray(data?.data)) lista = data.data;
      // Caso: [...]
      else if (Array.isArray(data)) lista = data;
      else return [];

      return lista
        .filter((r: any) => r.id)
        .slice(0, 20)
        .map((r: any) => ({
          id: r.id,
          codigo: r.codigo_reclamo || r.codigo || r.code || r.id.substring(0, 8),
          cliente_nombre: r.nombre_completo || r.cliente_nombre || r.nombre_cliente || r.consumidor_nombre || '',
          detalle: r.detalle || r.descripcion || '',
          estado: r.estado || '',
        }));
    } catch {
      return [];
    }
  };

  const ejecutar = async () => {
    if (!apiKey) { onNecesitaKey(); return; }

    if (!apiKeyInput.trim()) {
      setRespuesta(JSON.stringify({ error: 'Pega tu API Key completa en el campo de arriba' }, null, 2));
      setStatusCode(400);
      return;
    }

    let url = endpointActivo.ruta;
    if (endpointActivo.tieneParam) {
      if (!reclamoId.trim()) {
        setRespuesta(JSON.stringify({ error: 'Selecciona un reclamo primero. Ejecuta "Listar Reclamos" para ver los disponibles.' }, null, 2));
        setStatusCode(400);
        return;
      }
      url = url.replace(':id', reclamoId.trim());
    }

    setCargando(true);
    setRespuesta(null);
    const inicio = performance.now();

    try {
      const opciones: RequestInit = {
        method: endpointActivo.metodo,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKeyInput.trim(),
        },
      };

      if (endpointActivo.tieneBody && body.trim()) {
        opciones.body = body;
      }

      const res = await fetch(url, opciones);
      const fin = performance.now();
      setDuracion(Math.round(fin - inicio));
      setStatusCode(res.status);

      const data = await res.json();
      setRespuesta(JSON.stringify(data, null, 2));

      // Si fue Listar Reclamos exitoso, extraer la lista
      if (endpointActivo.id === 'listar' && res.ok) {
        const lista = extraerReclamos(data);
        setReclamos(lista);
        if (lista.length > 0 && !reclamoSeleccionado) {
          seleccionarReclamo(lista[0]);
        }
      }
    } catch (error: any) {
      const fin = performance.now();
      setDuracion(Math.round(fin - inicio));
      setStatusCode(0);
      setRespuesta(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setCargando(false);
    }
  };

  // ── Sin API Key generada ──
  if (!apiKey) {
    return (
      <CodeplexTarjeta titulo="Probar API">
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No tienes API keys activas
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Genera una API key para poder probar los endpoints del chatbot.
          </Typography>
          <CodeplexBoton texto="Generar API Key" variante="primario" alHacerClick={onNecesitaKey} />
        </Box>
      </CodeplexTarjeta>
    );
  }

  return (
    <CodeplexPila direccion="columna" espaciado={2}>
      {/* ── Paso 1: API Key ── */}
      <CodeplexTarjeta titulo="Paso 1: Ingresa tu API Key">
        <CodeplexCampoTexto
          etiqueta=""
          valor={apiKeyInput}
          alCambiar={(e) => setApiKeyInput(e.target.value)}
          marcador="Pega aquí tu API Key completa (crb_test_... o crb_live_...)"
          textoAyuda={apiKey ? `Key activa disponible: ${apiKey.key_prefix}... — Pega aquí la key completa que copiaste al generarla` : ''}
          anchoCompleto
        />
      </CodeplexTarjeta>

      {/* ── Reclamo seleccionado (banner) ── */}
      {reclamoSeleccionado && (
        <Box sx={{
          p: 1.5, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 2,
          display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        }}>
          <Typography variant="body2" fontWeight={700} color="#1e40af">
            Reclamo seleccionado:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{
              px: 1, py: 0.2, bgcolor: '#dbeafe', borderRadius: 1,
              fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#1e40af',
            }}>
              {reclamoSeleccionado.codigo}
            </Box>
            {reclamoSeleccionado.cliente_nombre && (
              <Typography variant="body2" color="text.secondary">
                {reclamoSeleccionado.cliente_nombre}
              </Typography>
            )}
            {reclamoSeleccionado.estado && (
              <Box component="span" sx={{
                px: 0.8, py: 0.1, borderRadius: 0.5, fontSize: '10px', fontWeight: 700,
                bgcolor: COLORES_ESTADO[reclamoSeleccionado.estado]?.bg || '#f3f4f6',
                color: COLORES_ESTADO[reclamoSeleccionado.estado]?.color || '#6b7280',
              }}>
                {reclamoSeleccionado.estado}
              </Box>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '10px' }}>
            ID: {reclamoSeleccionado.id}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        {/* ── Sidebar: Endpoints + Reclamos ── */}
        <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
          <CodeplexPila direccion="columna" espaciado={2}>
            {/* Endpoints */}
            <CodeplexTarjeta titulo="Paso 2: Elige acción">
              <CodeplexPila direccion="columna" espaciado={0.5}>
                {ENDPOINTS.map((ep) => {
                  const activo = ep.id === endpointActivo.id;
                  const tienePermiso = (chatbot as any)[ep.scope] === true;
                  const mc = COLORES_METODO[ep.metodo];
                  const necesitaReclamo = ep.tieneParam && !reclamoId;
                  return (
                    <Box
                      key={ep.id}
                      onClick={() => seleccionarEndpoint(ep)}
                      sx={{
                        p: 1.5, borderRadius: 1.5, cursor: 'pointer',
                        bgcolor: activo ? '#eff6ff' : 'transparent',
                        border: activo ? '1px solid #bfdbfe' : '1px solid transparent',
                        opacity: tienePermiso ? 1 : 0.45,
                        '&:hover': { bgcolor: activo ? '#eff6ff' : '#f8fafc' },
                        transition: 'all 0.15s',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="span" sx={{
                          px: 0.8, py: 0.2, borderRadius: 0.5, fontSize: '10px',
                          fontWeight: 800, fontFamily: 'monospace', bgcolor: mc.bg, color: mc.color,
                        }}>
                          {ep.metodo}
                        </Box>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '13px' }}>
                          {ep.nombre}
                        </Typography>
                      </Box>
                      {!tienePermiso && (
                        <Typography variant="caption" color="error" sx={{ fontSize: '10px', mt: 0.3, display: 'block' }}>
                          Sin permiso
                        </Typography>
                      )}
                      {tienePermiso && necesitaReclamo && ep.id !== 'listar' && (
                        <Typography variant="caption" sx={{ fontSize: '10px', mt: 0.3, display: 'block', color: '#d97706' }}>
                          Primero lista los reclamos
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </CodeplexPila>
            </CodeplexTarjeta>

            {/* Lista de reclamos disponibles */}
            {reclamos.length > 0 && (
              <CodeplexTarjeta titulo={`Reclamos (${reclamos.length})`}>
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  <CodeplexPila direccion="columna" espaciado={0.5}>
                    {reclamos.map((r) => {
                      const seleccionado = reclamoSeleccionado?.id === r.id;
                      const ce = COLORES_ESTADO[r.estado || ''];
                      return (
                        <Box
                          key={r.id}
                          onClick={() => seleccionarReclamo(r)}
                          sx={{
                            p: 1.2, borderRadius: 1.5, cursor: 'pointer',
                            bgcolor: seleccionado ? '#eff6ff' : '#f8fafc',
                            border: seleccionado ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                            '&:hover': { bgcolor: '#eff6ff', borderColor: '#93c5fd' },
                            transition: 'all 0.15s',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '13px', color: '#1e293b' }}>
                              {r.codigo}
                            </Typography>
                            {r.estado && ce && (
                              <Box component="span" sx={{
                                px: 0.6, py: 0.1, borderRadius: 0.5, fontSize: '9px',
                                fontWeight: 700, bgcolor: ce.bg, color: ce.color,
                              }}>
                                {r.estado}
                              </Box>
                            )}
                          </Box>
                          {r.cliente_nombre && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px', display: 'block', mt: 0.3 }}>
                              {r.cliente_nombre}
                            </Typography>
                          )}
                          <Tooltip title={r.detalle || ''}>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '10px', display: 'block', mt: 0.2, maxWidth: 220 }}>
                              {r.detalle ? (r.detalle.length > 60 ? r.detalle.substring(0, 60) + '...' : r.detalle) : ''}
                            </Typography>
                          </Tooltip>
                        </Box>
                      );
                    })}
                  </CodeplexPila>
                </Box>
              </CodeplexTarjeta>
            )}
          </CodeplexPila>
        </Box>

        {/* ── Main: Request builder + Response ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <CodeplexTarjeta titulo="Paso 3: Ejecutar">
            <CodeplexPila direccion="columna" espaciado={2}>
              {/* Descripción */}
              <Typography variant="body2" color="text.secondary">
                {endpointActivo.descripcion}
              </Typography>

              {/* Alerta scope */}
              {!scopeHabilitado && (
                <CodeplexAlerta
                  variante="peligro"
                  titulo="Permiso denegado"
                  descripcion={`Este chatbot no tiene el scope "${endpointActivo.scope}". Actívalo desde la configuración del chatbot.`}
                />
              )}

              {/* Alerta: necesita reclamo primero */}
              {endpointActivo.tieneParam && !reclamoId && reclamos.length === 0 && scopeHabilitado && (
                <CodeplexAlerta
                  variante="info"
                  titulo="Primero lista los reclamos"
                  descripcion='Ejecuta "Listar Reclamos" para obtener los reclamos disponibles y poder seleccionar uno.'
                />
              )}

              {/* URL preview */}
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">REQUEST</Typography>
                <Box sx={{
                  mt: 0.5, p: 1.5, bgcolor: '#1e293b', borderRadius: 1.5,
                  fontFamily: 'monospace', fontSize: '13px', color: '#e2e8f0',
                  display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto',
                }}>
                  <Box component="span" sx={{
                    px: 0.8, py: 0.2, borderRadius: 0.5, fontSize: '11px', fontWeight: 800,
                    bgcolor: COLORES_METODO[endpointActivo.metodo].bg,
                    color: COLORES_METODO[endpointActivo.metodo].color,
                  }}>
                    {endpointActivo.metodo}
                  </Box>
                  <span>
                    {endpointActivo.tieneParam && reclamoId
                      ? endpointActivo.ruta.replace(':id', reclamoId)
                      : endpointActivo.ruta
                    }
                  </span>
                </Box>
              </Box>

              {/* Body editor */}
              {endpointActivo.tieneBody && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">BODY (JSON)</Typography>

                  {/* Quick state buttons for Cambiar Estado */}
                  {endpointActivo.id === 'estado' && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, mb: 1, flexWrap: 'wrap' }}>
                      {[
                        { estado: 'PENDIENTE', color: '#92400e', bg: '#fef3c7' },
                        { estado: 'EN_PROCESO', color: '#1e40af', bg: '#dbeafe' },
                        { estado: 'RESUELTO', color: '#166534', bg: '#dcfce7' },
                        { estado: 'CERRADO', color: '#6b7280', bg: '#f3f4f6' },
                      ].map((e) => (
                        <Box
                          key={e.estado}
                          onClick={() => setBody(JSON.stringify({ estado: e.estado, comentario: 'Cambio desde panel de pruebas.' }, null, 2))}
                          sx={{
                            px: 1.5, py: 0.6, borderRadius: 1, cursor: 'pointer',
                            bgcolor: e.bg, color: e.color, fontWeight: 700, fontSize: '12px',
                            border: '2px solid transparent',
                            '&:hover': { borderColor: e.color, opacity: 0.9 },
                            transition: 'all 0.15s',
                          }}
                        >
                          {e.estado}
                        </Box>
                      ))}
                    </Box>
                  )}
                  <Box
                    component="textarea"
                    value={body}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
                    sx={{
                      mt: 0.5, width: '100%', minHeight: 120, p: 1.5,
                      fontFamily: 'monospace', fontSize: '13px',
                      border: '1px solid #e2e8f0', borderRadius: 1.5, bgcolor: '#f8fafc',
                      resize: 'vertical', outline: 'none',
                      '&:focus': { borderColor: '#3b82f6' },
                    }}
                  />
                </Box>
              )}

              {/* Ejecutar */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <CodeplexBoton
                  texto={endpointActivo.id === 'listar' ? 'Obtener Reclamos' : 'Ejecutar Request'}
                  variante="primario"
                  alHacerClick={ejecutar}
                  estado={cargando ? 'cargando' : 'inactivo'}
                  disabled={!scopeHabilitado || (endpointActivo.tieneParam && !reclamoId)}
                />
                {duracion !== null && (
                  <Typography variant="caption" color="text.secondary">{duracion}ms</Typography>
                )}
                {statusCode !== null && (
                  <Box component="span" sx={{
                    px: 0.8, py: 0.2, borderRadius: 0.5, fontSize: '11px', fontWeight: 700,
                    bgcolor: statusCode >= 200 && statusCode < 300 ? '#dcfce7' : '#fee2e2',
                    color: statusCode >= 200 && statusCode < 300 ? '#166534' : '#991b1b',
                  }}>
                    HTTP {statusCode}
                  </Box>
                )}
              </Box>

              {/* Respuesta */}
              {respuesta && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">RESPONSE</Typography>
                  <Box
                    component="pre"
                    sx={{
                      mt: 0.5, p: 2, bgcolor: '#0f172a', borderRadius: 1.5,
                      color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px',
                      overflow: 'auto', maxHeight: 400,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0,
                    }}
                  >
                    {respuesta}
                  </Box>
                </Box>
              )}
            </CodeplexPila>
          </CodeplexTarjeta>
        </Box>
      </Box>
    </CodeplexPila>
  );
}
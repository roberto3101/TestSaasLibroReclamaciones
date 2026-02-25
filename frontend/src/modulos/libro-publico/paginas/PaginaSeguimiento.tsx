import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CodeplexCampoTexto, CodeplexBoton, CodeplexCargando, CodeplexInsignia, CodeplexAlerta } from '@codeplex-sac/ui';
import { CodeplexIconoEnviar } from '@codeplex-sac/icons';
import { publicoApi } from '../api/publico.api';
import { manejarError } from '@/aplicacion/helpers/errores';
import { formatoFechaHora, formatoFecha } from '@/aplicacion/helpers/formato';
import type { ReclamoTracking, Mensaje, Tenant } from '@/tipos';
import { ESTADOS_RECLAMO } from '@/tipos/reclamo';

export default function PaginaSeguimiento() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [codigoBusqueda, setCodigoBusqueda] = useState('');
  const [reclamo, setReclamo] = useState<ReclamoTracking | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');

  const [cargandoReclamo, setCargandoReclamo] = useState(false);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tenantSlug) {
      publicoApi
        .obtenerTenant(tenantSlug)
        .then((data) => setTenant(data))
        .catch((err) => console.error('Error cargando tenant:', err));
    }
  }, [tenantSlug]);

  const buscarReclamo = async () => {
    if (!codigoBusqueda.trim() || !tenantSlug) return;
    setCargandoReclamo(true);
    setReclamo(null);
    setMensajes([]);
    try {
      const data = await publicoApi.consultarSeguimiento(tenantSlug, codigoBusqueda);
      if (!data) throw new Error('No se encontró el reclamo');
      setReclamo(data);
      cargarMensajes(data.codigo_reclamo);
    } catch (error) {
      manejarError(error, 'No se encontró el reclamo con ese código.');
    } finally {
      setCargandoReclamo(false);
    }
  };

  const cargarMensajes = async (codigo: string) => {
    if (!tenantSlug) return;
    setCargandoMensajes(true);
    try {
      const data = await publicoApi.listarMensajes(tenantSlug, codigo);
      setMensajes(Array.isArray(data) ? data : []);
      scrollToBottom();
    } catch (error) {
      console.error(error);
      setMensajes([]);
    } finally {
      setCargandoMensajes(false);
    }
  };

  const enviarMensaje = async () => {
    const codigo = reclamo?.codigo_reclamo;
    if (!nuevoMensaje.trim() || !codigo || !tenantSlug) return;
    setEnviandoMensaje(true);
    try {
      await publicoApi.enviarMensaje(tenantSlug, codigo, {
        tipo_mensaje: 'CLIENTE',
        mensaje: nuevoMensaje,
      });
      setNuevoMensaje('');
      await cargarMensajes(codigo);
    } catch (error) {
      manejarError(error);
    } finally {
      setEnviandoMensaje(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, 100);
  };

  useEffect(() => {
    if ((mensajes || []).length > 0) scrollToBottom();
  }, [mensajes]);

  const estadoInfo = reclamo ? ESTADOS_RECLAMO[reclamo.estado] : null;
  const colorMarca = tenant?.color_primario || '#3b82f6';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f0f4ff 0%, #fafbff 40%, #f5f0ff 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#1e293b',
        paddingBottom: 48,
      }}
    >
      {/* ═══ HEADER ═══ */}
      <div
        style={{
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', gap: 14 }}>
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.razon_social} style={{ height: 36, objectFit: 'contain' }} />
          ) : (
            <div
              style={{
                height: 40,
                width: 40,
                background: `linear-gradient(135deg, ${colorMarca}, ${colorMarca}dd)`,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              {tenant?.razon_social?.charAt(0) || 'C'}
            </div>
          )}
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
              {tenant?.razon_social || 'Cargando...'}
            </h1>
            <p style={{ fontSize: 12, color: '#64748b', fontWeight: 500, margin: 0 }}>Centro de Atención al Cliente</p>
          </div>
        </div>
      </div>

      {/* ═══ MAIN ═══ */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {/* ── BÚSQUEDA ── */}
        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            border: '1px solid #e8ecf2',
            padding: '36px 32px',
            marginBottom: 32,
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Consultar Estado de Trámite</h2>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 24px' }}>
            Ingresa el código que recibiste al registrar tu reclamo o queja.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <CodeplexCampoTexto
                etiqueta="Código de Seguimiento"
                valor={codigoBusqueda}
                alCambiar={(e) => setCodigoBusqueda(e.target.value.toUpperCase())}
                marcador="Ej: 2026-DEMO-A3F5B2"
                sx={{ width: '100%' }}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && buscarReclamo()}
              />
            </div>
            <CodeplexBoton
              texto="Rastrear Solicitud"
              variante="primario"
              alHacerClick={buscarReclamo}
              estado={cargandoReclamo ? 'cargando' : 'inactivo'}
              sx={{ height: 48, minWidth: 170, borderRadius: '12px' }}
            />
          </div>
        </div>

        {/* ── ILUSTRACIÓN PRE-BÚSQUEDA ── */}
        {!reclamo && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px 20px', textAlign: 'center' }}>
            <style>{`
              @keyframes floatUp { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
              @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
              @keyframes slideIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
              @keyframes scan { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(80px); opacity: 0; } }
            `}</style>
            <svg width="220" height="200" viewBox="0 0 220 200" fill="none" style={{ animation: 'floatUp 4s ease-in-out infinite' }}>
              {/* Sombra */}
              <ellipse cx="110" cy="188" rx="60" ry="8" fill="#e2e8f0" style={{ animation: 'pulse 4s ease-in-out infinite' }} />
              {/* Documento base */}
              <rect x="50" y="20" width="120" height="155" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="2" />
              <rect x="50" y="20" width="120" height="40" rx="12" fill={`${colorMarca}15`} />
              <rect x="50" y="48" width="120" height="12" rx="0" fill={`${colorMarca}15`} />
              {/* Icono check en header */}
              <circle cx="110" cy="40" r="12" fill={colorMarca} opacity="0.15" />
              <path d="M104 40l4 4 8-8" stroke={colorMarca} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Líneas de texto */}
              <rect x="68" y="75" width="84" height="6" rx="3" fill="#e2e8f0" />
              <rect x="68" y="90" width="64" height="6" rx="3" fill="#e2e8f0" />
              <rect x="68" y="105" width="74" height="6" rx="3" fill="#e2e8f0" />
              <rect x="68" y="120" width="50" height="6" rx="3" fill="#e2e8f0" />
              {/* Badge de estado */}
              <rect x="68" y="140" width="40" height="16" rx="8" fill={`${colorMarca}20`} />
              <rect x="76" y="146" width="24" height="4" rx="2" fill={colorMarca} opacity="0.6" />
              {/* Lupa */}
              <g style={{ animation: 'floatUp 3s ease-in-out infinite', animationDelay: '0.5s' }}>
                <circle cx="158" cy="50" r="18" fill="white" stroke={colorMarca} strokeWidth="2.5" />
                <circle cx="158" cy="50" r="10" fill={`${colorMarca}10`} stroke={colorMarca} strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="171" y1="63" x2="182" y2="74" stroke={colorMarca} strokeWidth="3" strokeLinecap="round" />
              </g>
              {/* Línea de escaneo animada */}
              <rect x="60" y="70" width="100" height="2" rx="1" fill={colorMarca} opacity="0.3" style={{ animation: 'scan 3s ease-in-out infinite' }} />
            </svg>

            <div style={{ animation: 'slideIn 0.6s ease-out', marginTop: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Rastrea tu solicitud</h3>
              <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 28px', maxWidth: 380, lineHeight: 1.6 }}>
                Ingresa el código que recibiste al registrar tu reclamo para ver el estado, la resolución y comunicarte directamente.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { icon: '📋', title: 'Consulta tu estado', desc: 'En tiempo real' },
                { icon: '💬', title: 'Comunícate', desc: 'Chat directo con la empresa' },
                { icon: '📄', title: 'Recibe tu resolución', desc: 'Descarga el PDF oficial' },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    animation: 'slideIn 0.6s ease-out',
                    animationDelay: `${0.2 + i * 0.15}s`,
                    animationFillMode: 'both',
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: '#f8fafc',
                      border: '1px solid #e8ecf2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                    }}
                  >
                    {item.icon}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0 }}>{item.title}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULTADO ── */}
        {reclamo && estadoInfo && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: 28, alignItems: 'start' }}>
            {/* ─ COLUMNA IZQUIERDA: DETALLES ─ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Card principal */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.07)',
                  border: '1px solid #e8ecf2',
                  overflow: 'hidden',
                }}
              >
                {/* Header del card */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                    padding: '20px 24px',
                    borderBottom: '1px solid #e8ecf2',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    Detalles del Caso
                  </span>
                  <CodeplexInsignia contenido={estadoInfo.etiqueta} color={estadoInfo.color as any} variante="estandar" />
                </div>

                {/* Body */}
                <div style={{ padding: 24 }}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      Nº Expediente
                    </label>
                    <p style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, wordBreak: 'break-all', lineHeight: 1.2 }}>
                      {reclamo.codigo_reclamo}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <DetailRow label="Fecha Registro" value={formatoFecha(reclamo.fecha_registro)} />
                    <DetailRow label="Tipo" value={reclamo.tipo_solicitud} />
                    {reclamo.sede_nombre && <DetailRow label="Sede" value={reclamo.sede_nombre} />}
                  </div>

                  {reclamo.respuesta_empresa && (
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                      <CodeplexAlerta variante="exito" titulo="Resolución Final" descripcion={reclamo.respuesta_empresa} />
                    </div>
                  )}
                </div>
              </div>

              {/* Línea de tiempo de estados */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  border: '1px solid #e8ecf2',
                  padding: '20px 24px',
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 16px' }}>
                  Progreso del trámite
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {(['PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'CERRADO'] as const).map((estado, i) => {
                    const info = ESTADOS_RECLAMO[estado];
                    const alcanzado = ['PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'CERRADO'].indexOf(reclamo.estado) >= i;
                    return (
                      <div key={estado} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: alcanzado ? colorMarca : '#e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: 13,
                              fontWeight: 700,
                              flexShrink: 0,
                              transition: 'all 0.3s',
                            }}
                          >
                            {alcanzado ? '✓' : i + 1}
                          </div>
                          {i < 3 && (
                            <div
                              style={{
                                width: 2,
                                height: 28,
                                background: alcanzado ? colorMarca : '#e2e8f0',
                                transition: 'all 0.3s',
                              }}
                            />
                          )}
                        </div>
                        <div style={{ paddingTop: 3, paddingBottom: i < 3 ? 12 : 0 }}>
                          <p style={{ fontSize: 13, fontWeight: alcanzado ? 700 : 500, color: alcanzado ? '#0f172a' : '#94a3b8', margin: 0 }}>
                            {info?.etiqueta || estado.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─ COLUMNA DERECHA: CHAT ─ */}
            <div
              style={{
                background: '#fff',
                borderRadius: 20,
                boxShadow: '0 8px 32px rgba(0,0,0,0.07)',
                border: '1px solid #e8ecf2',
                display: 'flex',
                flexDirection: 'column',
                height: 650,
                overflow: 'hidden',
              }}
            >
              {/* Header del chat */}
              <div
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #f1f5f9',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <h3 style={{ fontWeight: 700, color: '#334155', margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.5)' }} />
                  Comunicación Directa
                </h3>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Historial actualizado</span>
              </div>

              {/* Mensajes */}
              <div
                ref={chatRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 24,
                  background: 'linear-gradient(180deg, #f8fafc, #f1f5f9)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {cargandoMensajes && (mensajes || []).length === 0 ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <CodeplexCargando tipo="puntos" />
                  </div>
                ) : (mensajes || []).length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <div
                      style={{
                        background: '#e2e8f0',
                        borderRadius: '50%',
                        width: 56,
                        height: 56,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                        fontSize: 24,
                      }}
                    >
                      💬
                    </div>
                    <p style={{ fontWeight: 600, margin: '0 0 4px', color: '#64748b' }}>No hay mensajes aún</p>
                    <p style={{ fontSize: 13, margin: 0 }}>Envía un mensaje para iniciar la conversación.</p>
                  </div>
                ) : (
                  (mensajes || []).map((m) => {
                    const esCliente = m.tipo_mensaje === 'CLIENTE';
                    return (
                      <div key={m.id} style={{ display: 'flex', width: '100%', justifyContent: esCliente ? 'flex-end' : 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '75%', alignItems: esCliente ? 'flex-end' : 'flex-start' }}>
                          <div
                            style={{
                              padding: '12px 18px',
                              borderRadius: esCliente ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                              fontSize: 14,
                              lineHeight: 1.6,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                              ...(esCliente
                                ? { background: colorMarca, color: '#fff' }
                                : { background: '#fff', color: '#334155', border: '1px solid #e2e8f0' }),
                            }}
                          >
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.mensaje}</p>
                          </div>
                          <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, padding: '0 4px', fontWeight: 500 }}>
                            {esCliente ? 'Tú' : tenant?.razon_social || 'Soporte'} • {formatoFechaHora(m.fecha_mensaje)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input de mensaje */}
              <div style={{ padding: 16, background: '#fff', borderTop: '1px solid #f1f5f9' }}>
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-end',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: 14,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <CodeplexCampoTexto
                      etiqueta=""
                      valor={nuevoMensaje}
                      alCambiar={(e) => setNuevoMensaje(e.target.value)}
                      marcador="Escribe tu mensaje aquí..."
                      sx={{
                        width: '100%',
                        '& .MuiOutlinedInput-root': { border: 'none', boxShadow: 'none', background: 'transparent', padding: 0 },
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '& .MuiInputBase-input': { padding: '10px' },
                      }}
                      onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && enviarMensaje()}
                    />
                  </div>
                  <div style={{ paddingBottom: 4, paddingRight: 2 }}>
                    <CodeplexBoton
                      variante="primario"
                      soloIcono
                      iconoIzquierda={<CodeplexIconoEnviar />}
                      alHacerClick={enviarMensaje}
                      estado={enviandoMensaje ? 'cargando' : 'inactivo'}
                      sx={{ height: 40, width: 40, borderRadius: '10px', boxShadow: `0 4px 12px ${colorMarca}44` }}
                    />
                  </div>
                </div>
                <p style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', marginTop: 8 }}>
                  Los mensajes son monitoreados por {tenant?.razon_social || 'la empresa'} para calidad de servicio.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Componente helper para filas de detalle ── */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{value}</span>
    </div>
  );
}
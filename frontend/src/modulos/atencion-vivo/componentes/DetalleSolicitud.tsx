import { useState, useEffect } from 'react';
import { CodeplexModal } from '@codeplex-sac/utils';
import { CodeplexBoton, CodeplexCampoTexto, CodeplexSelector } from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import { Box, Typography, Divider, Tooltip } from '@mui/material';
import { solicitudesAsesorApi } from '../api/solicitudes-asesor.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import { formatoFechaHora, formatoRelativo } from '@/aplicacion/helpers/formato';
import type { SolicitudAsesor, PrioridadSolicitud } from '@/tipos/solicitud-asesor';
import type { SelectChangeEvent } from '@mui/material/Select';
import Swal from 'sweetalert2';
import { ChatAtencion } from './ChatAtencion';

interface Props {
  abierto: boolean;
  solicitud: SolicitudAsesor | null;
  alCerrar: () => void;
  alActualizar: () => void;
}

const COLORES_ESTADO: Record<string, { bg: string; color: string; label: string }> = {
  PENDIENTE: { bg: '#fef3c7', color: '#92400e', label: 'Pendiente' },
  EN_ATENCION: { bg: '#dbeafe', color: '#1e40af', label: 'En Atención' },
  RESUELTO: { bg: '#dcfce7', color: '#166534', label: 'Resuelto' },
  CANCELADO: { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelado' },
};

const COLORES_PRIORIDAD: Record<string, { bg: string; color: string }> = {
  BAJA: { bg: '#f3f4f6', color: '#6b7280' },
  NORMAL: { bg: '#dbeafe', color: '#1e40af' },
  ALTA: { bg: '#fef3c7', color: '#92400e' },
  URGENTE: { bg: '#fee2e2', color: '#991b1b' },
};

const COLORES_CANAL: Record<string, { bg: string; color: string }> = {
  WHATSAPP: { bg: '#dcfce7', color: '#166534' },
  WEB: { bg: '#dbeafe', color: '#1e40af' },
  TELEFONO: { bg: '#f3f4f6', color: '#6b7280' },
};

const PRIORIDADES: { valor: PrioridadSolicitud; etiqueta: string }[] = [
  { valor: 'BAJA', etiqueta: 'Baja' },
  { valor: 'NORMAL', etiqueta: 'Normal' },
  { valor: 'ALTA', etiqueta: 'Alta' },
  { valor: 'URGENTE', etiqueta: 'Urgente' },
];

// ── Helpers para campos nullable del backend ──
function extraerValor(campo: unknown): string | null {
  if (campo == null || campo === '') return null;
  if (typeof campo === 'string') return campo;
  if (typeof campo === 'object') {
    const obj = campo as Record<string, unknown>;
    if ('UUID' in obj && obj.Valid === true) return obj.UUID as string;
    if ('String' in obj && obj.Valid === true) return obj.String as string;
    if ('Time' in obj && obj.Valid === true) return obj.Time as string;
    if ('Valid' in obj && obj.Valid === false) return null;
  }
  return String(campo);
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
        {etiqueta}
      </Typography>
      <Box sx={{ mt: 0.3 }}>{children}</Box>
    </Box>
  );
}

function ResumenConversacion({ texto }: { texto: string }) {
  const [expandido, setExpandido] = useState(false);
  const lineas = texto.split('\n');
  const LIMITE_LINEAS = 6;
  const necesitaExpansion = lineas.length > LIMITE_LINEAS;
  const lineasVisibles = expandido ? lineas : lineas.slice(0, LIMITE_LINEAS);

  return (
    <Dato etiqueta="Conversación (WhatsApp)">
      <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0', maxHeight: expandido ? 'none' : '280px', overflow: 'hidden', position: 'relative' }}>
        {lineasVisibles.map((linea, i) => {
          const esCliente = linea.startsWith('[Cliente]');
          const esBot = linea.startsWith('[Bot]');
          const contenido = linea.replace(/^\[(Cliente|Bot)\]\s*/, '');
          if (!contenido.trim()) return null;
          return (
            <Box key={i} sx={{ mb: 1, display: 'flex', gap: 1 }}>
              <Box sx={{
                px: 0.8, py: 0.2, borderRadius: 1, fontSize: '10px', fontWeight: 700, flexShrink: 0, height: 'fit-content', mt: 0.3,
                bgcolor: esCliente ? '#dbeafe' : esBot ? '#dcfce7' : '#f3f4f6',
                color: esCliente ? '#1e40af' : esBot ? '#166534' : '#6b7280',
              }}>
                {esCliente ? 'Cliente' : esBot ? 'Bot' : '—'}
              </Box>
              <Typography variant="body2" sx={{ fontSize: '13px', lineHeight: 1.6, wordBreak: 'break-word' }}>
                {contenido}
              </Typography>
            </Box>
          );
        })}
        {!expandido && necesitaExpansion && (
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(transparent, #f0fdf4)' }} />
        )}
      </Box>
      {necesitaExpansion && (
        <Box
          onClick={() => setExpandido(!expandido)}
          sx={{ mt: 0.5, textAlign: 'center', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#166534', '&:hover': { textDecoration: 'underline' } }}
        >
          {expandido ? 'Mostrar menos ▲' : `Mostrar toda la conversación (${lineas.length} mensajes) ▼`}
        </Box>
      )}
    </Dato>
  );
}

export function DetalleSolicitud({ abierto, solicitud, alCerrar, alActualizar }: Props) {
  const [notaInterna, setNotaInterna] = useState('');
  const [notaResolver, setNotaResolver] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadSolicitud>('NORMAL');
  const [cargando, setCargando] = useState('');

  // Reasignación
  const [asesores, setAsesores] = useState<{ valor: string; etiqueta: string }[]>([]);
  const [asesorSeleccionado, setAsesorSeleccionado] = useState('');
  const [mostrarReasignar, setMostrarReasignar] = useState(false);

  // Estado local para mantener datos frescos en el modal
  const [solLocal, setSolLocal] = useState<SolicitudAsesor | null>(null);

  // Sincronizar con prop padre
  useEffect(() => {
    if (solicitud) {
      setSolLocal(solicitud);
      setNotaInterna(extraerValor(solicitud.nota_interna) || '');
      setPrioridad(solicitud.prioridad);
      setNotaResolver('');
      setAsesorSeleccionado('');
      setMostrarReasignar(false);
    }
  }, [solicitud]);

  // Re-fetch para mantener datos actualizados en el modal
  const refrescar = async () => {
    alActualizar();
    if (solicitud) {
      try {
        const actualizada = await solicitudesAsesorApi.obtener(solicitud.id);
        setSolLocal(actualizada);
        setNotaInterna(extraerValor(actualizada.nota_interna) || '');
        setPrioridad(actualizada.prioridad);
      } catch {
        /* si falla, el modal se cerrará */
      }
    }
  };

  // Cargar asesores al abrir reasignación
  useEffect(() => {
    if (!mostrarReasignar) return;
    solicitudesAsesorApi.listarAsesores()
      .then((usuarios) => {
        const opciones = usuarios
          .filter((u: { id: string; activo?: boolean }) => u.activo !== false)
          .map((u: { id: string; nombre_completo: string; rol: string }) => ({
            valor: u.id,
            etiqueta: `${u.nombre_completo} (${u.rol})`,
          }));
        setAsesores(opciones);
      })
      .catch(() => notificar.error('No se pudieron cargar los asesores'));
  }, [mostrarReasignar]);

  const sol = solLocal || solicitud;
  if (!sol) return null;

  const estaAbierta = sol.estado === 'PENDIENTE' || sol.estado === 'EN_ATENCION';
  const ce = COLORES_ESTADO[sol.estado];
  const cp = COLORES_PRIORIDAD[sol.prioridad];
  const cc = COLORES_CANAL[sol.canal_origen];

  const tomar = async () => {
    setCargando('tomar');
    try {
      await solicitudesAsesorApi.tomar(sol.id);
      notificar.exito('Solicitud tomada — ahora estás a cargo');
      refrescar();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando('');
    }
  };

  const reasignar = async () => {
    if (!asesorSeleccionado) return notificar.advertencia('Selecciona un asesor');
    setCargando('reasignar');
    try {
      await solicitudesAsesorApi.asignar(sol.id, { asignado_a: asesorSeleccionado });
      notificar.exito('Solicitud reasignada');
      setMostrarReasignar(false);
      refrescar();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando('');
    }
  };

  const resolver = async () => {
    const result = await Swal.fire({
      title: '¿Marcar como resuelta?',
      html: '<p style="font-size:14px;color:#4b5563">La solicitud se cerrará como resuelta.</p>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Resolver',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
      didOpen: (el) => { if (el.parentElement) el.parentElement.style.zIndex = '9999'; },
    });
    if (!result.isConfirmed) return;

    setCargando('resolver');
    try {
      await solicitudesAsesorApi.resolver(sol.id, {
        nota_interna: notaResolver.trim() || undefined,
      });
      notificar.exito('Solicitud resuelta');
      refrescar();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando('');
    }
  };

  const cancelar = async () => {
    const result = await Swal.fire({
      title: '¿Cancelar solicitud?',
      html: '<p style="font-size:14px;color:#4b5563">La solicitud se cerrará como cancelada.</p>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cancelar solicitud',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#dc2626',
      didOpen: (el) => { if (el.parentElement) el.parentElement.style.zIndex = '9999'; },
    });
    if (!result.isConfirmed) return;

    setCargando('cancelar');
    try {
      await solicitudesAsesorApi.cancelar(sol.id);
      notificar.exito('Solicitud cancelada');
      refrescar();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando('');
    }
  };

  const guardarPrioridad = async () => {
    if (prioridad === sol.prioridad) return;
    setCargando('prioridad');
    try {
      await solicitudesAsesorApi.actualizarPrioridad(sol.id, { prioridad });
      notificar.exito('Prioridad actualizada');
      refrescar();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando('');
    }
  };

  const guardarNota = async () => {
    setCargando('nota');
    try {
      await solicitudesAsesorApi.actualizarNota(sol.id, { nota_interna: notaInterna });
      notificar.exito('Nota interna guardada');
      refrescar();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando('');
    }
  };

  const abrirWhatsApp = () => {
    const tel = sol.telefono.replace(/\D/g, '');
    window.open(`https://wa.me/${tel}`, '_blank');
  };

  return (
    <CodeplexModal
      open={abierto}
      onClose={alCerrar}
      title="Detalle de Solicitud"
      maxWidth="md"
      footer={
        <CodeplexPila direccion="fila" espaciado={1} sx={{ justifyContent: 'flex-end' }}>
          <CodeplexBoton texto="Cerrar" variante="contorno" alHacerClick={alCerrar} />
        </CodeplexPila>
      }
    >
      <CodeplexPila direccion="columna" espaciado={2.5}>
        {/* ── Badges de estado ── */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ px: 1.5, py: 0.4, borderRadius: 2, fontSize: '12px', fontWeight: 700, bgcolor: ce.bg, color: ce.color }}>
            {ce.label}
          </Box>
          <Box sx={{ px: 1.5, py: 0.4, borderRadius: 2, fontSize: '12px', fontWeight: 700, bgcolor: cp.bg, color: cp.color }}>
            {sol.prioridad}
          </Box>
          <Box sx={{ px: 1.5, py: 0.4, borderRadius: 2, fontSize: '12px', fontWeight: 700, bgcolor: cc.bg, color: cc.color }}>
            {sol.canal_origen}
          </Box>
        </Box>

        {/* ── Datos del solicitante ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Dato etiqueta="Nombre">
            <Typography variant="body1" fontWeight={600}>{sol.nombre}</Typography>
          </Dato>
          <Dato etiqueta="Teléfono">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" fontWeight={600} fontFamily="monospace">
                {sol.telefono}
              </Typography>
              <Box
                onClick={abrirWhatsApp}
                sx={{
                  px: 1, py: 0.2, borderRadius: 1, fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  bgcolor: '#dcfce7', color: '#166534', '&:hover': { bgcolor: '#bbf7d0' }, transition: 'all 0.15s',
                }}
              >
                Abrir WhatsApp
              </Box>
            </Box>
          </Dato>
          <Dato etiqueta="Creado">
            <Typography variant="body2">{formatoFechaHora(sol.fecha_creacion)}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              {formatoRelativo(sol.fecha_creacion)}
            </Typography>
          </Dato>
          {extraerValor(sol.asignado_a) && (
            <Dato etiqueta="Asignado a">
              <Tooltip
                title={
                  <Box sx={{ p: 0.5 }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {sol.nombre_asesor || 'Asesor asignado'}
                    </Typography>
                    {extraerValor(sol.fecha_asignacion) && (
                      <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', mt: 0.3 }}>
                        Asignado el {formatoFechaHora(extraerValor(sol.fecha_asignacion) as string)}
                      </Typography>
                    )}
                    <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', mt: 0.3 }}>
                      ID: {(extraerValor(sol.asignado_a) as string)?.slice(0, 8)}…
                    </Typography>
                  </Box>
                }
                arrow
                placement="top"
                slotProps={{
                  tooltip: {
                    sx: {
                      bgcolor: '#1e293b',
                      borderRadius: '10px',
                      px: 1.5,
                      py: 1,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    },
                  },
                  arrow: { sx: { color: '#1e293b' } },
                }}
              >
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1, py: 0.4, borderRadius: 1.5, transition: 'all 0.15s', '&:hover': { bgcolor: '#f0fdf4' } }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#16a34a', flexShrink: 0, boxShadow: '0 0 0 3px rgba(22,163,74,0.15)' }} />
                  <Typography variant="body2" fontWeight={600}>
                    {sol.nombre_asesor || 'Asesor asignado'}
                  </Typography>
                </Box>
              </Tooltip>
              {extraerValor(sol.fecha_asignacion) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                  Tomada el {formatoFechaHora(extraerValor(sol.fecha_asignacion) as string)}
                </Typography>
              )}
            </Dato>
          )}
          {extraerValor(sol.fecha_resolucion) && (
            <Dato etiqueta="Fecha resolución">
              <Typography variant="body2">{formatoFechaHora(extraerValor(sol.fecha_resolucion) as string)}</Typography>
            </Dato>
          )}
        </Box>

        {/* ── Motivo ── */}
        <Dato etiqueta="Motivo">
          <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {sol.motivo}
            </Typography>
          </Box>
        </Dato>

        {/* ── Resumen conversación ── */}
        {extraerValor(sol.resumen_conversacion) && (
          <ResumenConversacion texto={extraerValor(sol.resumen_conversacion) as string} />
        )}

        {/* ── Chat en vivo (visible en EN_ATENCION, RESUELTO y CANCELADO) ── */}
        {sol.estado !== 'PENDIENTE' && (
          <>
            <Divider />
            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
              <ChatAtencion
                solicitudId={sol.id}
                estaAbierta={estaAbierta}
              />
            </Box>
          </>
        )}

        {/* ── Acciones (solo si está abierta) ── */}
        {estaAbierta && (
          <>
            <Divider />
            <Typography variant="subtitle2" fontWeight={700}>Acciones</Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {sol.estado === 'PENDIENTE' && (
                <CodeplexBoton
                  texto="Tomar Solicitud"
                  variante="primario"
                  alHacerClick={tomar}
                  estado={cargando === 'tomar' ? 'cargando' : 'inactivo'}
                />
              )}
              <CodeplexBoton
                texto="Reasignar"
                variante="contorno"
                alHacerClick={() => setMostrarReasignar(!mostrarReasignar)}
              />
              <CodeplexBoton
                texto="Marcar Resuelta"
                variante="primario"
                alHacerClick={resolver}
                estado={cargando === 'resolver' ? 'cargando' : 'inactivo'}
              />
              <CodeplexBoton
                texto="Cancelar Solicitud"
                variante="contorno"
                alHacerClick={cancelar}
                estado={cargando === 'cancelar' ? 'cargando' : 'inactivo'}
              />
            </Box>

            {/* Reasignar asesor */}
            {mostrarReasignar && (
              <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" fontWeight={700} sx={{ mb: 1, display: 'block', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', color: 'text.secondary' }}>
                  Derivar a otro asesor
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <CodeplexSelector
                    etiqueta="Asesor"
                    opciones={asesores}
                    value={asesorSeleccionado}
                    alCambiar={(e: SelectChangeEvent<unknown>) => setAsesorSeleccionado(e.target.value as string)}
                  />
                  <CodeplexBoton
                    texto="Reasignar"
                    variante="primario"
                    tamano="sm"
                    alHacerClick={reasignar}
                    estado={cargando === 'reasignar' ? 'cargando' : 'inactivo'}
                  />
                </Box>
              </Box>
            )}

            {/* Nota al resolver */}
            <CodeplexCampoTexto
              etiqueta="Nota al resolver (opcional)"
              valor={notaResolver}
              alCambiar={(e) => setNotaResolver(e.target.value)}
              multilinea
              filas={2}
              marcador="Agrega una nota antes de resolver..."
              anchoCompleto
            />

            {/* Cambiar prioridad */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <CodeplexSelector
                etiqueta="Prioridad"
                opciones={PRIORIDADES}
                value={prioridad}
                alCambiar={(e: SelectChangeEvent<unknown>) => setPrioridad(e.target.value as PrioridadSolicitud)}
              />
              {prioridad !== sol.prioridad && (
                <CodeplexBoton
                  texto="Guardar"
                  variante="primario"
                  tamano="sm"
                  alHacerClick={guardarPrioridad}
                  estado={cargando === 'prioridad' ? 'cargando' : 'inactivo'}
                />
              )}
            </Box>
          </>
        )}

        {/* ── Nota interna (siempre visible y editable) ── */}
        <Divider />
        <Box>
          <CodeplexCampoTexto
            etiqueta="Nota interna"
            valor={notaInterna}
            alCambiar={(e) => setNotaInterna(e.target.value)}
            multilinea
            filas={3}
            marcador="Notas internas del equipo (no visibles para el solicitante)..."
            anchoCompleto
          />
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <CodeplexBoton
              texto="Guardar Nota"
              variante="contorno"
              tamano="sm"
              alHacerClick={guardarNota}
              estado={cargando === 'nota' ? 'cargando' : 'inactivo'}
            />
          </Box>
        </Box>
      </CodeplexPila>
    </CodeplexModal>
  );
}
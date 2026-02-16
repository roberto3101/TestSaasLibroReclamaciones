import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

// Iconos
import { FiSend, FiCheckCircle, FiArrowLeft, FiAlertCircle, FiClock, FiUser, FiFileText, FiMessageSquare, FiRefreshCw } from 'react-icons/fi';

// APIs
import { reclamosApi } from '../api/reclamos.api';
import { mensajesApi } from '@/modulos/mensajes/api/mensajes.api';

// Helpers y Tipos
import { formatoFecha, formatoFechaHora } from '@/aplicacion/helpers/formato';
import { manejarError } from '@/aplicacion/helpers/errores';
import type { Reclamo, Mensaje, EstadoReclamo } from '@/tipos';
import { ESTADOS_RECLAMO } from '@/tipos/reclamo';

export default function PaginaDetalleReclamo() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const chatRef = useRef<HTMLDivElement>(null);

  // --- ESTADOS ---
  const [reclamo, setReclamo] = useState<Reclamo | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);

  // Inputs
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [textoResolucion, setTextoResolucion] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<EstadoReclamo | ''>('');

  // Loading States
  const [cargando, setCargando] = useState(true);
  const [enviandoChat, setEnviandoChat] = useState(false);
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [enviandoResolucion, setEnviandoResolucion] = useState(false);

  // --- CARGA INICIAL ---
  useEffect(() => {
    if (id) cargarExpediente();
  }, [id]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensajes]);

  const cargarExpediente = async () => {
    if (!id) return;
    setCargando(true);
    try {
      const [dataReclamo, dataMensajes] = await Promise.all([
        reclamosApi.obtenerPorId(id),
        mensajesApi.listarPorReclamo(id)
      ]);
      setReclamo(dataReclamo);
      setMensajes(dataMensajes || []);
      setNuevoEstado(dataReclamo.estado);
    } catch (error) {
      manejarError(error, "No se pudo cargar el expediente");
      navigate('/panel/reclamos');
    } finally {
      setCargando(false);
    }
  };

  // --- ACCIÓN 1: CAMBIAR ESTADO ---
  const actualizarEstado = async () => {
    if (!id || !nuevoEstado || nuevoEstado === reclamo?.estado) return;

    const confirm = await Swal.fire({
      title: '¿Cambiar estado?',
      html: `<p style="color:#4b5563;font-size:15px;">El estado pasará a <strong>${ESTADOS_RECLAMO[nuevoEstado].etiqueta}</strong>.<br/>El cliente recibirá una notificación por correo electrónico.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, actualizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
    });

    if (!confirm.isConfirmed) return;

    setGuardandoEstado(true);
    try {
      await reclamosApi.cambiarEstado(id, { estado: nuevoEstado });
      const data = await reclamosApi.obtenerPorId(id);
      setReclamo(data);
      Swal.fire({ title: 'Actualizado', text: 'Estado modificado y cliente notificado.', icon: 'success', confirmButtonColor: '#2563eb' });
    } catch (error) {
      manejarError(error);
    } finally {
      setGuardandoEstado(false);
    }
  };

  // --- ACCIÓN 2: CHAT (ADMIN -> CLIENTE) ---
  const enviarMensaje = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!nuevoMensaje.trim() || !id) return;

    setEnviandoChat(true);
    try {
      await mensajesApi.enviar(id, nuevoMensaje);
      setNuevoMensaje('');
      const msgs = await mensajesApi.listarPorReclamo(id);
      setMensajes(msgs);
    } catch (error) {
      manejarError(error);
    } finally {
      setEnviandoChat(false);
    }
  };

  // --- ACCIÓN 3: RESOLUCIÓN FINAL ---
  const emitirResolucion = async () => {
    if (!id || !textoResolucion.trim()) {
      return Swal.fire({ title: 'Atención', text: 'Debe escribir la respuesta final para el cliente.', icon: 'warning', confirmButtonColor: '#2563eb' });
    }

    const confirm = await Swal.fire({
      title: '¿Emitir Resolución Final?',
      html: '<p style="color:#4b5563;font-size:15px;">Esta acción marcará el caso como <strong>RESUELTO</strong>, generará un PDF oficial y lo enviará al correo del cliente.</p>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Emitir y Resolver',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
    });

    if (!confirm.isConfirmed) return;

    setEnviandoResolucion(true);
    try {
      await reclamosApi.emitirRespuesta(id, {
        respuesta_empresa: textoResolucion,
        accion_tomada: 'Resolución vía Panel Web',
      });
      await Swal.fire({ title: 'Resolución emitida', text: 'El caso ha sido resuelto y el cliente notificado con el PDF adjunto.', icon: 'success', confirmButtonColor: '#059669' });
      cargarExpediente();
    } catch (error) {
      manejarError(error);
    } finally {
      setEnviandoResolucion(false);
    }
  };

  // --- RENDERIZADO ---
  if (cargando) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-200 border-t-blue-600"></div>
        <span className="text-sm text-gray-400 font-medium">Cargando expediente...</span>
      </div>
    </div>
  );

  if (!reclamo) return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-gray-400 gap-3">
      <FiFileText size={48} className="opacity-40" />
      <p className="text-lg font-medium">No se encontró el reclamo</p>
      <button onClick={() => navigate('/reclamos')} className="text-sm text-blue-600 hover:underline mt-2">
        Volver al listado
      </button>
    </div>
  );

  const estadoInfo = ESTADOS_RECLAMO[reclamo.estado];
  const estaResuelto = reclamo.estado === 'RESUELTO' || reclamo.estado === 'CERRADO';
  const diasRestantes = reclamo.dias_restantes ?? 0;
  const esVencido = diasRestantes < 0;
  const esUrgente = diasRestantes >= 0 && diasRestantes <= 3;

  // GOD MODE: El admin SIEMPRE puede cambiar estado y enviar mensajes.
  // Incluso si el caso está resuelto, puede reabrir o comunicarse con el cliente.
  const esFinalizado = false;

  return (
    <div className="min-h-screen bg-gray-50/80 pb-20 p-4 md:p-8 font-sans">

      {/* ─── HEADER ─── */}
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reclamos')}
              className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              title="Volver al listado"
            >
              <FiArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{reclamo.codigo_reclamo}</h1>
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${estadoInfo.color}15`, color: estadoInfo.color, border: `1px solid ${estadoInfo.color}30` }}
                >
                  {estadoInfo.etiqueta}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-500 flex-wrap">
                <FiClock size={13} />
                <span>Registrado: {formatoFecha(reclamo.fecha_registro)}</span>
                <span className="text-gray-200">|</span>
                <span className={`flex items-center gap-1 ${esVencido ? 'text-red-600 font-semibold' : esUrgente ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                  {esVencido && <FiAlertCircle size={13} />}
                  Vence: {formatoFecha(reclamo.fecha_limite_respuesta)}
                  {esVencido && <span className="text-[10px] ml-1 uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">Vencido</span>}
                  {esUrgente && !esVencido && <span className="text-[10px] ml-1 uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">Urgente</span>}
                </span>
              </div>
            </div>
          </div>

          {/* SELECTOR DE ESTADO - Siempre visible para el admin */}
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <select
              className="bg-transparent border-none text-sm font-semibold text-gray-700 focus:ring-0 cursor-pointer py-2 pl-3 pr-8 outline-none rounded-md"
              value={nuevoEstado}
              onChange={(e) => setNuevoEstado(e.target.value as EstadoReclamo)}
              disabled={guardandoEstado}
            >
              {Object.keys(ESTADOS_RECLAMO).map((k) => (
                <option key={k} value={k}>{ESTADOS_RECLAMO[k as EstadoReclamo].etiqueta}</option>
              ))}
            </select>
            <button
              onClick={actualizarEstado}
              disabled={nuevoEstado === reclamo.estado || guardandoEstado}
              className={`text-xs px-4 py-2 rounded-md font-semibold transition-all text-white
                ${nuevoEstado === reclamo.estado ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-sm active:scale-[0.97]'}
              `}
            >
              {guardandoEstado ? (
                <span className="flex items-center gap-1.5">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white"></div>
                  Guardando...
                </span>
              ) : 'Actualizar'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ─── COLUMNA IZQUIERDA (Datos) ─── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Tarjeta Consumidor */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FiUser size={15} className="text-blue-500" />
                Datos del Consumidor
              </h3>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <InfoRow label="Nombre" value={reclamo.nombre_completo} />
              <InfoRow label="Documento" value={`${reclamo.tipo_documento}: ${reclamo.numero_documento}`} />
              <InfoRow label="Email" value={reclamo.email} isEmail />
              <InfoRow label="Teléfono" value={reclamo.telefono} />
              <InfoRow label="Dirección" value={reclamo.domicilio} />
            </div>
          </div>

          {/* Tarjeta Incidente */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FiFileText size={15} className="text-blue-500" />
                Detalle del Incidente
              </h3>
            </div>
            <div className="p-6 space-y-5 text-sm">
              <div className="bg-blue-50/60 p-4 rounded-lg border border-blue-100/80">
                <p className="text-[10px] font-bold text-blue-500/80 uppercase mb-1.5 tracking-wider">Bien Contratado</p>
                <p className="font-semibold text-gray-900">{reclamo.tipo_bien || 'No especificado'}</p>
                <p className="text-gray-600 mt-1 leading-relaxed">{reclamo.descripcion_bien}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Detalle del Reclamo</p>
                <div className="bg-gray-50 border border-gray-200/80 p-4 rounded-lg text-gray-700 whitespace-pre-wrap leading-relaxed text-[13px]">
                  {reclamo.detalle_reclamo}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Pedido del Cliente</p>
                <div className="bg-gray-50 border border-gray-200/80 p-4 rounded-lg text-gray-700 whitespace-pre-wrap leading-relaxed text-[13px]">
                  {reclamo.pedido_consumidor}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── COLUMNA DERECHA (Gestión) ─── */}
        <div className="lg:col-span-8 space-y-6">

          {/* BANNER DE CASO RESUELTO (informativo, no bloquea acciones) */}
          {estaResuelto && (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/60 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <FiCheckCircle className="text-emerald-600" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-emerald-800 mb-1">Caso Resuelto</h3>
                  <p className="text-sm text-emerald-700">
                    Atendido el{' '}
                    <span className="font-semibold">{reclamo.fecha_respuesta ? formatoFecha(reclamo.fecha_respuesta) : 'N/A'}</span>.
                    {' '}Puede reabrir el caso cambiando el estado desde el selector superior.
                  </p>
                  {reclamo.respuesta_empresa && (
                    <div className="mt-3 bg-white/70 backdrop-blur-sm rounded-lg border border-emerald-100 p-4">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1.5 tracking-wider">Respuesta emitida</p>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm line-clamp-4">{reclamo.respuesta_empresa}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* RESOLUCIÓN - Siempre visible, con hint si ya fue resuelto */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden border-l-4 border-l-blue-500">
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  {estaResuelto ? <FiRefreshCw className="text-amber-500" /> : <FiCheckCircle className="text-blue-500" />}
                  {estaResuelto ? 'Emitir Nueva Resolución' : 'Resolución y Cierre'}
                </h3>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                {estaResuelto
                  ? 'Este caso ya fue resuelto. Puede emitir una nueva resolución si es necesario — se generará un nuevo PDF y se enviará al cliente.'
                  : 'Redacte la respuesta final. Al emitir, se generará un PDF oficial y se enviará al correo del cliente.'
                }
              </p>
              <textarea
                className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-h-[140px] text-sm outline-none transition-all resize-y placeholder:text-gray-400"
                placeholder="Estimado cliente, tras revisar su caso hemos determinado..."
                value={textoResolucion}
                onChange={(e) => setTextoResolucion(e.target.value)}
              />
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-400">
                  {textoResolucion.length > 0 && `${textoResolucion.length} caracteres`}
                </p>
                <button
                  onClick={emitirResolucion}
                  disabled={enviandoResolucion || !textoResolucion.trim()}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-all shadow-sm
                    ${enviandoResolucion || !textoResolucion.trim()
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97]'}
                  `}
                >
                  {enviandoResolucion ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                      Procesando...
                    </span>
                  ) : (
                    <>
                      <FiCheckCircle size={16} />
                      {estaResuelto ? 'Emitir Nueva Resolución' : 'Emitir Resolución Final'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* CHAT - Siempre activo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col" style={{ height: '560px' }}>
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center shrink-0">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FiMessageSquare size={15} className="text-blue-500" />
                Mensajería
              </h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                {mensajes.length} {mensajes.length === 1 ? 'mensaje' : 'mensajes'}
              </span>
            </div>

            {/* Area de Mensajes */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50" ref={chatRef}>
              {mensajes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                  <FiMessageSquare size={36} className="mb-3 opacity-40" />
                  <p className="text-sm font-medium">Sin mensajes previos</p>
                  <p className="text-xs mt-1">Los mensajes enviados aquí llegarán por correo al cliente.</p>
                </div>
              ) : (
                mensajes.map((m) => {
                  const soyAdmin = m.tipo_mensaje === 'EMPRESA';
                  return (
                    <div key={m.id} className={`flex w-full ${soyAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] px-4 py-3 text-sm shadow-sm ${
                          soyAdmin
                            ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                            : 'bg-white border border-gray-200/80 text-gray-800 rounded-2xl rounded-bl-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.mensaje}</p>
                        <div className={`text-[10px] mt-2 flex justify-end gap-1.5 ${soyAdmin ? 'text-blue-200' : 'text-gray-400'}`}>
                          <span>{soyAdmin ? 'Empresa' : 'Cliente'}</span>
                          <span>·</span>
                          <span>{formatoFechaHora(m.fecha_mensaje)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Area - Siempre activo */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={enviarMensaje} className="flex gap-3">
                <input
                  type="text"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-sm placeholder:text-gray-400"
                  placeholder="Escriba un mensaje para el cliente..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={enviandoChat || !nuevoMensaje.trim()}
                  className={`px-4 rounded-lg flex items-center justify-center transition-all
                    ${enviandoChat || !nuevoMensaje.trim()
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:scale-95'}
                  `}
                >
                  {enviandoChat
                    ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                    : <FiSend size={18} />
                  }
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper Component ─────────────────────────────────────────────────────

function InfoRow({ label, value, isEmail }: { label: string; value?: string | null; isEmail?: boolean }) {
  return (
    <div className="flex flex-col border-b border-gray-50 last:border-0 pb-3 last:pb-0">
      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">{label}</span>
      {isEmail && value ? (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline font-medium text-sm truncate" title={value}>
          {value}
        </a>
      ) : (
        <span className="text-gray-800 font-medium truncate text-sm" title={value || ''}>{value || '—'}</span>
      )}
    </div>
  );
}
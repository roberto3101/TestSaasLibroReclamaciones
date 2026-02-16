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
    // --- LÓGICA ---
    const { tenantSlug } = useParams<{ tenantSlug: string }>();
    
    // 1. Estado para la empresa (Tenant)
    const [tenant, setTenant] = useState<Tenant | null>(null);
    
    const [codigoBusqueda, setCodigoBusqueda] = useState('');
    const [reclamo, setReclamo] = useState<ReclamoTracking | null>(null);
    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [nuevoMensaje, setNuevoMensaje] = useState('');
    
    const [cargandoReclamo, setCargandoReclamo] = useState(false);
    const [cargandoMensajes, setCargandoMensajes] = useState(false);
    const [enviandoMensaje, setEnviandoMensaje] = useState(false);
    
    const chatRef = useRef<HTMLDivElement>(null);

    // 2. Efecto para cargar los datos de la empresa al entrar
    useEffect(() => {
        if (tenantSlug) {
            publicoApi.obtenerTenant(tenantSlug)
                .then(data => setTenant(data))
                .catch(err => console.error("Error cargando tenant:", err));
        }
    }, [tenantSlug]);

    const buscarReclamo = async () => {
        if (!codigoBusqueda.trim() || !tenantSlug) return;
        setCargandoReclamo(true);
        setReclamo(null);
        setMensajes([]); 
        try {
            const data = await publicoApi.consultarSeguimiento(tenantSlug, codigoBusqueda);
            if (!data) throw new Error("No se encontró el reclamo");
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
            // Blindaje contra null
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
                mensaje: nuevoMensaje
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
            if (chatRef.current) {
                chatRef.current.scrollTop = chatRef.current.scrollHeight;
            }
        }, 100);
    };

    useEffect(() => {
        if ((mensajes || []).length > 0) scrollToBottom();
    }, [mensajes]);

    const estadoInfo = reclamo ? ESTADOS_RECLAMO[reclamo.estado] : null;

    // --- RENDERIZADO ---
    return (
        <div className="min-h-screen bg-gray-50/80 font-sans text-slate-800 pb-12">
            
            {/* Header Dinámico: Muestra Logo o Razón Social */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {tenant?.logo_url ? (
                            <img src={tenant.logo_url} alt={tenant.razon_social} className="h-8 w-auto object-contain" />
                        ) : (
                            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                                {tenant?.razon_social?.charAt(0) || 'C'}
                            </div>
                        )}
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">
                                {tenant?.razon_social || 'Cargando...'}
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">Centro de Atención</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                
                {/* 1. SECCIÓN DE BÚSQUEDA */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="w-full flex-grow">
                            <h2 className="text-lg font-semibold text-slate-700 mb-4">Consultar Estado de Trámite</h2>
                            <CodeplexCampoTexto
                                etiqueta="Ingrese Código de Seguimiento"
                                valor={codigoBusqueda}
                                alCambiar={(e) => setCodigoBusqueda(e.target.value.toUpperCase())}
                                marcador="Ej: REC-2026-XYZ-123"
                                sx={{ width: '100%' }}
                                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && buscarReclamo()}
                            />
                        </div>
                        <div className="w-full md:w-auto pb-[2px]">
                            <CodeplexBoton
                                texto="Rastrear Solicitud"
                                variante="primario"
                                alHacerClick={buscarReclamo}
                                estado={cargandoReclamo ? 'cargando' : 'inactivo'}
                                sx={{ width: { xs: '100%', md: 'auto' }, height: '48px', minWidth: '160px' }}
                            />
                        </div>
                    </div>
                </div>

                {reclamo && estadoInfo && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
                        
                        {/* 2. COLUMNA IZQUIERDA: DETALLES */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                                <div className="bg-slate-50/50 px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Detalles del Caso</span>
                                    <CodeplexInsignia 
                                        contenido={estadoInfo.etiqueta} 
                                        color={estadoInfo.color as any} 
                                        variante="estandar" 
                                    />
                                </div>
                                
                                <div className="p-6 space-y-6">
                                    <div>
                                        <label className="text-xs text-gray-400 font-medium uppercase mb-1 block">Nº Expediente</label>
                                        <p className="text-2xl font-bold text-slate-900 break-all leading-none">{reclamo.codigo_reclamo}</p>
                                    </div>

                                    <div className="border-t border-gray-100 pt-4 grid grid-cols-1 gap-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Fecha Registro</span>
                                            <span className="text-sm font-medium text-slate-900">{formatoFecha(reclamo.fecha_registro)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Tipo</span>
                                            <span className="text-sm font-medium text-slate-900">{reclamo.tipo_solicitud}</span>
                                        </div>
                                        {reclamo.sede_nombre && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500">Sede</span>
                                                <span className="text-sm font-medium text-slate-900">{reclamo.sede_nombre}</span>
                                            </div>
                                        )}
                                    </div>

                                    {reclamo.respuesta_empresa && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <CodeplexAlerta
                                                variante="exito"
                                                titulo="Resolución Final"
                                                descripcion={reclamo.respuesta_empresa}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. COLUMNA DERECHA: CHAT */}
                        <div className="lg:col-span-8">
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col h-[650px] overflow-hidden">
                                
                                <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between shadow-sm z-10">
                                    <h3 className="font-bold text-slate-700 m-0 flex items-center gap-2.5">
                                        <div className="relative flex h-3 w-3">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                        </div>
                                        Comunicación Directa
                                    </h3>
                                    <span className="text-xs text-gray-400">Historial actualizado</span>
                                </div>

                                <div 
                                    ref={chatRef}
                                    className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4 scroll-smooth"
                                >
                                    {cargandoMensajes && (mensajes || []).length === 0 ? (
                                        <div className="flex h-full items-center justify-center">
                                            <div className="scale-125"><CodeplexCargando tipo="puntos" /></div>
                                        </div>
                                    ) : (mensajes || []).length === 0 ? (
                                        <div className="flex flex-col h-full items-center justify-center text-gray-400 opacity-80">
                                            <div className="bg-gray-100 p-4 rounded-full mb-3">
                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                            </div>
                                            <p className="font-medium">No hay mensajes recientes</p>
                                            <p className="text-sm">Envíe un mensaje para iniciar la conversación.</p>
                                        </div>
                                    ) : (
                                        (mensajes || []).map((m) => {
                                            // LÓGICA DE PERSPECTIVA DEL CLIENTE:
                                            // Si el tipo es 'CLIENTE', soy YO (derecha, azul).
                                            // Si es cualquier otra cosa ('EMPRESA', 'ADMIN', etc.), es el Tenant (izquierda, blanco).
                                            const esCliente = m.tipo_mensaje === 'CLIENTE';
                                            
                                            return (
                                                <div key={m.id} className={`flex w-full ${esCliente ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${esCliente ? 'items-end' : 'items-start'}`}>
                                                        <div className={`
                                                            px-5 py-3.5 rounded-2xl text-[15px] shadow-sm relative leading-relaxed
                                                            ${esCliente 
                                                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                                                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                                                            }
                                                        `}>
                                                            <p className="m-0 whitespace-pre-wrap">{m.mensaje}</p>
                                                        </div>
                                                        <span className="text-[11px] text-gray-400 mt-1.5 px-1 font-medium">
                                                            {esCliente ? 'Tú' : (tenant?.razon_social || 'Soporte')} • {formatoFechaHora(m.fecha_mensaje)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Footer con Input integrado */}
                                <div className="p-4 bg-white border-t border-gray-100">
                                    <div className="flex gap-3 items-end bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                                        <div className="flex-grow">
                                            <CodeplexCampoTexto
                                                etiqueta=""
                                                valor={nuevoMensaje}
                                                alCambiar={(e) => setNuevoMensaje(e.target.value)}
                                                marcador="Escribe tu mensaje aquí..."
                                                sx={{ 
                                                    width: '100%', 
                                                    '& .MuiOutlinedInput-root': { border: 'none', boxShadow: 'none', background: 'transparent', padding: 0 },
                                                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                                    '& .MuiInputBase-input': { padding: '10px' }
                                                }}
                                                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && enviarMensaje()}
                                            />
                                        </div>
                                        <div className="shrink-0 pb-1 pr-1">
                                            <CodeplexBoton
                                                variante="primario"
                                                soloIcono
                                                iconoIzquierda={<CodeplexIconoEnviar />}
                                                alHacerClick={enviarMensaje}
                                                estado={enviandoMensaje ? 'cargando' : 'inactivo'}
                                                sx={{ height: '40px', width: '40px', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)' }}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-center text-[10px] text-gray-400 mt-2">
                                        Los mensajes son monitoreados por {tenant?.razon_social || 'la empresa'} para calidad de servicio.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
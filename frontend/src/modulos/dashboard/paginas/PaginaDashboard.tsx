import { useState, useEffect, useCallback } from 'react';
import { http } from '@/api/http';
import { usarSedes } from '@/modulos/sedes/ganchos/usarSedes';
import { manejarError } from '@/aplicacion/helpers/errores';
import type { ApiResponse } from '@/tipos';

// ── Tipos ──

interface DashboardUso {
  plan_codigo: string;
  plan_nombre: string;
  suscripcion_estado: string;
  suscripcion_ciclo: string;
  suscripcion_es_trial: boolean;
  limite_sedes: number;
  limite_usuarios: number;
  limite_reclamos_mes: number;
  limite_chatbots: number;
  limite_canales_whatsapp: number;
  uso_sedes: number;
  uso_usuarios: number;
  uso_reclamos_mes: number;
  uso_chatbots: number;
  uso_canales_whatsapp: number;
  permite_chatbot: boolean;
  permite_whatsapp: boolean;
  permite_reportes_pdf: boolean;
  permite_exportar_excel: boolean;
  permite_api: boolean;
  permite_asistente_ia: boolean;
  permite_atencion_vivo: boolean;
}

interface DashboardMetricas {
  total: number;
  pendientes: number;
  en_proceso: number;
  resueltos: number;
  cerrados: number;
  total_reclamos: number;
  total_quejas: number;
  vencidos: number;
  ultimos_7_dias: number;
  este_mes: number;
  promedio_dias_resolucion: number;
}

// ── API ──

const dashboardApi = {
  obtenerUso: () =>
    http.get<ApiResponse<DashboardUso>>('/dashboard/uso').then((r) => r.data.data),
  obtenerMetricas: (sedeId?: string) => {
    const params: Record<string, string> = {};
    if (sedeId) params.sede_id = sedeId;
    return http.get<ApiResponse<DashboardMetricas>>('/dashboard/metricas', { params }).then((r) => r.data.data);
  },
};

// ── Componente Principal ──

export default function PaginaDashboard() {
  const [uso, setUso] = useState<DashboardUso | null>(null);
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [sedeId, setSedeId] = useState<string>('');
  const [cargando, setCargando] = useState(true);
  const { sedes } = usarSedes();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [u, m] = await Promise.all([
        dashboardApi.obtenerUso(),
        dashboardApi.obtenerMetricas(sedeId || undefined),
      ]);
      setUso(u);
      setMetricas(m);
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  }, [sedeId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando || !uso || !metricas) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-200 border-t-blue-600" />
          <span className="text-sm text-gray-400 font-medium">Cargando panel...</span>
        </div>
      </div>
    );
  }

  const esTrial = uso.suscripcion_es_trial;
  const limiteIlimitado = uso.limite_reclamos_mes === -1;

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Panel de Control</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-gray-500">
              Plan {uso.plan_nombre}
            </span>
            {esTrial && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                Periodo de Prueba
              </span>
            )}
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
              {uso.suscripcion_estado}
            </span>
          </div>
        </div>

        <select
          value={sedeId}
          onChange={(e) => setSedeId(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-w-[180px] cursor-pointer"
        >
          <option value="">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>

      {/* ── Banner Trial ── */}
      {esTrial && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Estás en periodo de prueba</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Tienes acceso limitado a {uso.limite_reclamos_mes} reclamos/mes. Actualiza tu plan para desbloquear todas las funcionalidades.
            </p>
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaKPI
          titulo="Este Mes"
          valor={metricas.este_mes}
          subtitulo={limiteIlimitado ? 'Ilimitado' : `de ${uso.limite_reclamos_mes}`}
          icono="📋"
          color="blue"
        />
        <TarjetaKPI
          titulo="Pendientes"
          valor={metricas.pendientes}
          subtitulo={metricas.en_proceso > 0 ? `${metricas.en_proceso} en proceso` : 'Sin procesar'}
          icono="⏳"
          color="amber"
        />
        <TarjetaKPI
          titulo="Vencidos"
          valor={metricas.vencidos}
          subtitulo={metricas.vencidos > 0 ? 'Requieren atención' : 'Todo al día'}
          icono="🚨"
          color={metricas.vencidos > 0 ? 'red' : 'green'}
        />
        <TarjetaKPI
          titulo="Resolución"
          valor={metricas.promedio_dias_resolucion}
          subtitulo="días promedio"
          icono="⚡"
          color="green"
          esDias
        />
      </div>

      {/* ── Distribución + Tipo ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Distribución por Estado */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
            Distribución por Estado
          </h3>

          {metricas.total === 0 ? (
            <div className="flex flex-col items-center justify-center h-[140px] text-gray-300">
              <span className="text-3xl mb-2">📭</span>
              <p className="text-sm font-medium">Sin reclamos registrados</p>
            </div>
          ) : (
            <>
              {/* Barra horizontal segmentada */}
              <BarraEstados metricas={metricas} />

              {/* Leyenda */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <ItemLeyenda color="#f59e0b" etiqueta="Pendiente" valor={metricas.pendientes} total={metricas.total} />
                <ItemLeyenda color="#3b82f6" etiqueta="En Proceso" valor={metricas.en_proceso} total={metricas.total} />
                <ItemLeyenda color="#10b981" etiqueta="Resuelto" valor={metricas.resueltos} total={metricas.total} />
                <ItemLeyenda color="#6b7280" etiqueta="Cerrado" valor={metricas.cerrados} total={metricas.total} />
              </div>
            </>
          )}
        </div>

        {/* Reclamos vs Quejas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
            Tipo de Solicitud
          </h3>

          {metricas.total === 0 ? (
            <div className="flex flex-col items-center justify-center h-[140px] text-gray-300">
              <span className="text-3xl mb-2">📊</span>
              <p className="text-sm font-medium">Sin datos</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnilloTipo metricas={metricas} />

              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-gray-600">Reclamos</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{metricas.total_reclamos}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-violet-500" />
                    <span className="text-sm text-gray-600">Quejas</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{metricas.total_quejas}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Actividad Reciente ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Actividad Reciente
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MiniStat etiqueta="Últimos 7 días" valor={metricas.ultimos_7_dias} icono="📅" />
          <MiniStat etiqueta="Total histórico" valor={metricas.total} icono="📦" />
          <MiniStat etiqueta="Resueltos" valor={metricas.resueltos} icono="✅" />
        </div>
      </div>

      {/* ── Recursos del Plan ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Recursos del Plan
          </h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
            {uso.suscripcion_ciclo}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <BarraRecurso
            etiqueta="Sedes"
            uso={uso.uso_sedes}
            limite={uso.limite_sedes}
            icono="🏢"
          />
          <BarraRecurso
            etiqueta="Usuarios"
            uso={uso.uso_usuarios}
            limite={uso.limite_usuarios}
            icono="👥"
          />
          {uso.permite_chatbot && (
            <BarraRecurso
              etiqueta="Chatbots"
              uso={uso.uso_chatbots}
              limite={uso.limite_chatbots}
              icono="🤖"
            />
          )}
          {uso.permite_whatsapp && (
            <BarraRecurso
              etiqueta="Canales WhatsApp"
              uso={uso.uso_canales_whatsapp}
              limite={uso.limite_canales_whatsapp}
              icono="📱"
            />
          )}
          <BarraRecurso
            etiqueta="Reclamos / Mes"
            uso={uso.uso_reclamos_mes}
            limite={uso.limite_reclamos_mes}
            icono="📋"
          />
        </div>
      </div>

      {/* ── Funcionalidades ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Funcionalidades del Plan
        </h3>
        <div className="flex flex-wrap gap-2">
          <Funcionalidad activa={true} nombre="Email" />
          <Funcionalidad activa={uso.permite_chatbot} nombre="Chatbot IA" />
          <Funcionalidad activa={uso.permite_whatsapp} nombre="WhatsApp" />
          <Funcionalidad activa={uso.permite_reportes_pdf} nombre="Reportes PDF" />
          <Funcionalidad activa={uso.permite_exportar_excel} nombre="Exportar Excel" />
          <Funcionalidad activa={uso.permite_api} nombre="API" />
          <Funcionalidad activa={uso.permite_asistente_ia} nombre="Asistente IA" />
          <Funcionalidad activa={uso.permite_atencion_vivo} nombre="Atención en Vivo" />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Subcomponentes
// ══════════════════════════════════════════════════════════════

const COLORES_MAP: Record<string, { bg: string; bgLight: string; text: string; border: string }> = {
  blue:  { bg: 'bg-blue-600',  bgLight: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-100' },
  amber: { bg: 'bg-amber-500', bgLight: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  red:   { bg: 'bg-red-500',   bgLight: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-100' },
  green: { bg: 'bg-emerald-500', bgLight: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
};

function TarjetaKPI({ titulo, valor, subtitulo, icono, color, esDias }: {
  titulo: string; valor: number; subtitulo: string; icono: string; color: string; esDias?: boolean;
}) {
  const c = COLORES_MAP[color] || COLORES_MAP.blue;
  return (
    <div className={`${c.bgLight} rounded-xl border ${c.border} p-5 transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{titulo}</span>
        <span className="text-xl">{icono}</span>
      </div>
      <p className={`text-3xl font-extrabold ${c.text} tracking-tight leading-none`}>
        {esDias ? valor.toFixed(1) : valor}
      </p>
      <p className="text-xs text-gray-500 mt-1.5 font-medium">{subtitulo}</p>
    </div>
  );
}

function BarraEstados({ metricas }: { metricas: DashboardMetricas }) {
  const total = metricas.total || 1;
  const segmentos = [
    { valor: metricas.pendientes, color: '#f59e0b' },
    { valor: metricas.en_proceso, color: '#3b82f6' },
    { valor: metricas.resueltos, color: '#10b981' },
    { valor: metricas.cerrados, color: '#6b7280' },
  ];

  return (
    <div className="w-full h-8 rounded-lg overflow-hidden flex bg-gray-100">
      {segmentos.map((seg, i) => {
        const pct = (seg.valor / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={i}
            style={{ width: `${pct}%`, backgroundColor: seg.color, minWidth: pct > 0 ? '2px' : 0 }}
            className="h-full transition-all duration-500 relative group"
          >
            {pct >= 8 && (
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
                {seg.valor}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ItemLeyenda({ color, etiqueta, valor, total }: {
  color: string; etiqueta: string; valor: number; total: number;
}) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div>
        <p className="text-sm font-semibold text-gray-800">{valor}</p>
        <p className="text-[11px] text-gray-400">{etiqueta} · {pct}%</p>
      </div>
    </div>
  );
}

function AnilloTipo({ metricas }: { metricas: DashboardMetricas }) {
  const total = metricas.total || 1;
  const pctReclamos = (metricas.total_reclamos / total) * 100;
  const pctQuejas = (metricas.total_quejas / total) * 100;

  const circumference = 2 * Math.PI * 42;
  const offsetReclamos = circumference * (1 - pctReclamos / 100);

  return (
    <div className="flex justify-center">
      <div className="relative w-[120px] h-[120px]">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Fondo (quejas) */}
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="12"
            opacity="0.2"
          />
          {/* Reclamos */}
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offsetReclamos}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
          {/* Quejas (segundo arco) */}
          {pctQuejas > 0 && (
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pctQuejas / 100)}
              strokeLinecap="round"
              style={{ transform: `rotate(${pctReclamos * 3.6}deg)`, transformOrigin: '50% 50%' }}
              className="transition-all duration-700"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-gray-900">{total}</span>
          <span className="text-[10px] text-gray-400 font-medium">total</span>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ etiqueta, valor, icono }: { etiqueta: string; valor: number; icono: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
      <span className="text-2xl">{icono}</span>
      <div>
        <p className="text-xl font-bold text-gray-900">{valor}</p>
        <p className="text-xs text-gray-500">{etiqueta}</p>
      </div>
    </div>
  );
}

function BarraRecurso({ etiqueta, uso, limite, icono }: {
  etiqueta: string; uso: number; limite: number; icono: string;
}) {
  const ilimitado = limite === -1;
  const pct = ilimitado ? (uso > 0 ? 15 : 0) : limite > 0 ? Math.min((uso / limite) * 100, 100) : 0;
  const esAlto = !ilimitado && pct >= 90;
  const esMedio = !ilimitado && pct >= 70 && pct < 90;

  const colorBarra = esAlto ? 'bg-red-500' : esMedio ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600 flex items-center gap-1.5">
          <span>{icono}</span> {etiqueta}
        </span>
        <span className="text-sm font-bold text-gray-900">
          {uso} {ilimitado ? '' : `/ ${limite}`}
          {ilimitado && <span className="text-xs font-normal text-gray-400 ml-1">∞</span>}
        </span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorBarra} transition-all duration-500`}
          style={{ width: `${Math.max(pct, uso > 0 ? 2 : 0)}%` }}
        />
      </div>
      {!ilimitado && (
        <p className={`text-[11px] mt-1 font-medium ${esAlto ? 'text-red-500' : esMedio ? 'text-amber-500' : 'text-gray-400'}`}>
          {esAlto ? '⚠️ Casi al límite' : esMedio ? 'Uso elevado' : `${Math.round(pct)}% utilizado`}
        </p>
      )}
    </div>
  );
}

function Funcionalidad({ activa, nombre }: { activa: boolean; nombre: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        activa
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-gray-50 text-gray-400 border-gray-200 line-through opacity-60'
      }`}
    >
      {activa ? '✓' : '✗'} {nombre}
    </span>
  );
}
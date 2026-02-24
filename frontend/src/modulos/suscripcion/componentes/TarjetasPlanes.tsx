// src/modulos/suscripcion/componentes/TarjetasPlanes.tsx
import { useState } from 'react';
import { CodeplexCargando } from '@codeplex-sac/ui';
import { CodeplexCaja } from '@codeplex-sac/layout';
import { usarPlanes } from '../ganchos/usarPlanes';
import { usarSuscripcion } from '../ganchos/usarSuscripcion';
import { formatoMoneda } from '@/aplicacion/helpers/formato';
import { ahorroAnual, formatoLimite } from '@/tipos/plan';
import type { Plan, CicloSuscripcion } from '@/tipos';

const colores = {
  primario: '#f97316',
  tarjeta: '#ffffff',
  texto: '#1f2937',
  textoSecundario: '#6b7280',
  borde: '#e5e7eb',
  exito: '#10b981',
  destacado: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
};

interface Props {
  planActualCodigo?: string;
  onSeleccionar?: (plan: Plan, ciclo: CicloSuscripcion) => void;
  soloLectura?: boolean;
}

export default function TarjetasPlanes({ planActualCodigo, onSeleccionar, soloLectura }: Props) {
  const { planes, cargando } = usarPlanes();
  const { datos: suscripcionData } = usarSuscripcion();
  const [ciclo, setCiclo] = useState<CicloSuscripcion>('MENSUAL');

  const codigoActual = planActualCodigo ?? suscripcionData?.plan?.codigo;

  if (cargando) {
    return (
      <CodeplexCaja centrado sx={{ minHeight: '60vh' }}>
        <CodeplexCargando tipo="anillo" etiqueta="Cargando planes..." />
      </CodeplexCaja>
    );
  }

  const planesVisibles = planes.filter((p) => p.activo && p.codigo !== 'DEMO').sort((a, b) => a.orden - b.orden);

  const funcionalidades = (plan: Plan) => [
    { nombre: `${formatoLimite(plan.max_sedes)} sedes`, activo: true },
    { nombre: `${formatoLimite(plan.max_usuarios)} usuarios`, activo: true },
    { nombre: `${formatoLimite(plan.max_reclamos_mes)} reclamos/mes`, activo: true },
    { nombre: `${formatoLimite(plan.max_chatbots)} chatbots`, activo: plan.permite_chatbot },
    { nombre: `${formatoLimite(plan.max_canales_whatsapp)} canales WhatsApp`, activo: plan.permite_whatsapp },
    { nombre: 'Notificaciones email', activo: plan.permite_email },
    { nombre: 'Reportes PDF', activo: plan.permite_reportes_pdf },
    { nombre: 'Exportar Excel', activo: plan.permite_exportar_excel },
    { nombre: 'Acceso API', activo: plan.permite_api },
    { nombre: 'Asistente IA', activo: plan.permite_asistente_ia },
    { nombre: 'Atención en vivo', activo: plan.permite_atencion_vivo },
    { nombre: 'Marca blanca', activo: plan.permite_marca_blanca },
  ];

  return (
    <div style={est.contenedor}>
      <h1 style={est.titulo}>Elige tu plan</h1>
      <p style={est.subtitulo}>Escala tu gestión de reclamos con el plan que mejor se adapte a tu negocio</p>

      {/* Toggle ciclo */}
      <div style={est.toggle}>
        <button style={est.toggleBtn(ciclo === 'MENSUAL')} onClick={() => setCiclo('MENSUAL')}>Mensual</button>
        <button style={est.toggleBtn(ciclo === 'ANUAL')} onClick={() => setCiclo('ANUAL')}>
          Anual
          <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', marginLeft: 8, fontWeight: 700 }}>Ahorra</span>
        </button>
      </div>

      {/* Grid de planes */}
      <div style={est.grid}>
        {planesVisibles.map((plan) => {
          const esActual = plan.codigo === codigoActual;
          const precioMostrar = ciclo === 'ANUAL' && plan.precio_anual != null ? plan.precio_anual / 12 : plan.precio_mensual;
          const ahorro = ahorroAnual(plan);

          return (
            <div
              key={plan.id}
              style={est.tarjeta(plan.destacado, esActual)}
              onMouseEnter={(e) => { if (!esActual) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; }}}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = plan.destacado ? '0 8px 30px rgba(249,115,22,0.15)' : '0 1px 3px rgba(0,0,0,0.06)'; }}
            >
              {plan.destacado && <div style={est.badge}>Recomendado</div>}
              {esActual && <div style={{ ...est.badge, background: '#10b981' }}>Tu plan actual</div>}

              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: colores.texto, margin: 0 }}>{plan.nombre}</h3>
              {plan.descripcion && <p style={{ color: colores.textoSecundario, fontSize: '0.9rem', margin: 0 }}>{plan.descripcion}</p>}

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: colores.texto }}>{formatoMoneda(precioMostrar)}</span>
                  <span style={{ fontSize: '1rem', color: colores.textoSecundario }}>/mes</span>
                </div>
                {ciclo === 'ANUAL' && plan.precio_anual != null && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: colores.textoSecundario }}>{formatoMoneda(plan.precio_anual)}/año</p>
                )}
                {ciclo === 'ANUAL' && ahorro > 0 && (
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, display: 'inline-block' }}>
                    Ahorras {formatoMoneda(ahorro)}/año
                  </span>
                )}
              </div>

              <hr style={{ border: 'none', borderTop: `1px solid ${colores.borde}`, margin: '4px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {funcionalidades(plan).map((f) => (
                  <div key={f.nombre} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', color: colores.texto, opacity: f.activo ? 1 : 0.4 }}>
                    <div style={f.activo ? est.check : est.cross}>{f.activo ? '✓' : '✕'}</div>
                    <span style={{ textDecoration: f.activo ? 'none' : 'line-through' }}>{f.nombre}</span>
                  </div>
                ))}
              </div>

              <hr style={{ border: 'none', borderTop: `1px solid ${colores.borde}`, margin: '4px 0' }} />

              {(plan.precio_sede_extra > 0 || plan.precio_usuario_extra > 0) && (
                <div style={{ fontSize: '0.8rem', color: colores.textoSecundario }}>
                  {plan.precio_sede_extra > 0 && <p style={{ margin: '2px 0' }}>+ {formatoMoneda(plan.precio_sede_extra)}/sede extra</p>}
                  {plan.precio_usuario_extra > 0 && <p style={{ margin: '2px 0' }}>+ {formatoMoneda(plan.precio_usuario_extra)}/usuario extra</p>}
                </div>
              )}

              <button
                style={est.boton(plan.destacado, esActual || !!soloLectura)}
                disabled={esActual || soloLectura}
                onClick={() => onSeleccionar?.(plan, ciclo)}
              >
                {esActual ? 'Plan actual' : 'Seleccionar plan'}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: 40, color: colores.textoSecundario, fontSize: '0.85rem' }}>
        <p>Precios en Soles (S/). Incluye IGV. Puedes cambiar o cancelar tu plan en cualquier momento.</p>
      </div>
    </div>
  );
}

const est = {
  contenedor: { maxWidth: 1100, margin: '0 auto', padding: '40px 20px' } as React.CSSProperties,
  titulo: { fontSize: '2rem', fontWeight: 800, textAlign: 'center' as const, color: colores.texto, margin: 0 },
  subtitulo: { textAlign: 'center' as const, color: colores.textoSecundario, fontSize: '1.05rem', marginTop: 8, marginBottom: 32 },
  toggle: { display: 'flex', justifyContent: 'center', gap: 0, background: '#f3f4f6', borderRadius: 12, padding: 4, width: 'fit-content', margin: '0 auto 40px' } as React.CSSProperties,
  toggleBtn: (activo: boolean) => ({
    padding: '10px 28px', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
    transition: 'all 0.25s ease', background: activo ? colores.primario : 'transparent',
    color: activo ? '#fff' : colores.textoSecundario, boxShadow: activo ? '0 2px 8px rgba(249,115,22,0.3)' : 'none',
  }) as React.CSSProperties,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'stretch' } as React.CSSProperties,
  tarjeta: (destacado: boolean, esActual: boolean) => ({
    background: colores.tarjeta, borderRadius: 16, padding: '32px 28px',
    border: destacado ? `2px solid ${colores.primario}` : `1px solid ${colores.borde}`,
    position: 'relative' as const, display: 'flex', flexDirection: 'column' as const, gap: 20,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: destacado ? '0 8px 30px rgba(249,115,22,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
    opacity: esActual ? 0.7 : 1,
  }) as React.CSSProperties,
  badge: {
    position: 'absolute' as const, top: -14, left: '50%', transform: 'translateX(-50%)',
    background: colores.destacado, color: '#fff', padding: '6px 20px', borderRadius: 20,
    fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' as const,
  },
  check: { width: 20, height: 20, borderRadius: '50%', background: '#ecfdf5', color: colores.exito, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 } as React.CSSProperties,
  cross: { width: 20, height: 20, borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0, opacity: 0.5 } as React.CSSProperties,
  boton: (destacado: boolean, deshabilitado: boolean) => ({
    width: '100%', padding: '14px 0',
    border: destacado ? 'none' : `2px solid ${colores.primario}`, borderRadius: 12,
    cursor: deshabilitado ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.95rem',
    transition: 'all 0.2s ease',
    background: deshabilitado ? '#e5e7eb' : destacado ? colores.destacado : 'transparent',
    color: deshabilitado ? '#9ca3af' : destacado ? '#fff' : colores.primario, marginTop: 'auto',
  }) as React.CSSProperties,
};
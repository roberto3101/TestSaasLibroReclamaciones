// src/modulos/planes/componentes/UsoWidget.tsx
// Widget compacto para el dashboard. Si falla la API, no muestra nada.
import { usarUsoTenant } from '../ganchos/usarSuscripcion';
import { porcentajeUso } from '@/tipos/suscripcion';

const C = {
  primario: '#f97316',
  texto: '#1f2937',
  textoSec: '#6b7280',
  borde: '#e5e7eb',
  exito: '#10b981',
  advertencia: '#f59e0b',
  peligro: '#ef4444',
  info: '#3b82f6',
};

export default function UsoWidget() {
  const { uso, cargando } = usarUsoTenant();

  if (cargando || !uso) return null;

  const recursos = [
    { etiqueta: 'Sedes', uso: uso.uso_sedes, limite: uso.limite_sedes },
    { etiqueta: 'Usuarios', uso: uso.uso_usuarios, limite: uso.limite_usuarios },
    { etiqueta: 'Reclamos', uso: uso.uso_reclamos_mes, limite: uso.limite_reclamos_mes },
    { etiqueta: 'Chatbots', uso: uso.uso_chatbots, limite: uso.limite_chatbots },
    { etiqueta: 'WhatsApp', uso: uso.uso_canales_whatsapp, limite: uso.limite_canales_whatsapp },
  ];

  return (
    <div style={est.contenedor}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: C.texto }}>Tu plan</span>
        <span style={{
          background: C.primario + '15',
          color: C.primario,
          padding: '4px 12px',
          borderRadius: 8,
          fontSize: '0.75rem',
          fontWeight: 700,
        }}>
          {uso.plan_nombre}
          {uso.es_trial && ' (Trial)'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {recursos.map((r) => {
          const pct = porcentajeUso(r.uso, r.limite);
          const ilimitado = r.limite === -1;
          const color = ilimitado ? C.info : pct >= 90 ? C.peligro : pct >= 70 ? C.advertencia : C.exito;

          return (
            <div key={r.etiqueta}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.78rem', color: C.textoSec }}>{r.etiqueta}</span>
                <span style={{ fontSize: '0.78rem', color: C.textoSec, fontWeight: 600 }}>
                  {ilimitado ? `${r.uso}/∞` : `${r.uso}/${r.limite}`}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: '#f3f4f6' }}>
                <div style={{
                  width: ilimitado ? '10%' : `${Math.min(pct, 100)}%`,
                  height: '100%',
                  borderRadius: 3,
                  background: color,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <a href="/suscripcion" style={{
        display: 'block',
        textAlign: 'center',
        marginTop: 16,
        fontSize: '0.8rem',
        color: C.primario,
        fontWeight: 600,
        textDecoration: 'none',
      }}>
        Ver detalles del plan →
      </a>
    </div>
  );
}

const est = {
  contenedor: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    border: `1px solid ${C.borde}`,
  } as React.CSSProperties,
};
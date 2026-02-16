import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { CodeplexCaja, CodeplexContenedor, CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexBoton } from '@codeplex-sac/ui';
import { CodeplexIconoExito } from '@codeplex-sac/icons';

interface ConfirmacionState {
  codigo_reclamo?: string;
  fecha_registro?: string;
  fecha_limite_respuesta?: string;
  mensaje?: string;
}

export default function PaginaConfirmacion() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navegar = useNavigate();
  const location = useLocation();
  const state = (location.state as ConfirmacionState) || {};

  const formatearFecha = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <CodeplexContenedor anchoMaximo="sm" paginaCentrada>
      <CodeplexCaja variante="sombreado" relleno={5} sx={{ borderRadius: 3, textAlign: 'center' }}>
        <CodeplexPila direccion="columna" espaciado={2} sx={{ alignItems: 'center' }}>
          <CodeplexIconoExito sx={{ fontSize: 64, color: 'success.main' }} />
          <h2 style={{ margin: 0 }}>¡Reclamo Registrado!</h2>

          {state.codigo_reclamo && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                padding: '12px 20px',
                width: '100%',
              }}
            >
              <p style={{ color: '#6b7280', margin: 0, fontSize: '0.85rem' }}>
                Código de reclamo
              </p>
              <p
                style={{
                  color: '#166534',
                  margin: '4px 0 0',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  letterSpacing: '0.5px',
                }}
              >
                {state.codigo_reclamo}
              </p>
            </div>
          )}

          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>
            {state.mensaje ||
              'Tu reclamo ha sido registrado exitosamente. Recibirás una respuesta dentro del plazo legal establecido.'}
          </p>

          {(state.fecha_registro || state.fecha_limite_respuesta) && (
            <div
              style={{
                display: 'flex',
                gap: 24,
                justifyContent: 'center',
                flexWrap: 'wrap',
                width: '100%',
              }}
            >
              {state.fecha_registro && (
                <div>
                  <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.75rem' }}>Fecha de registro</p>
                  <p style={{ color: '#374151', margin: '2px 0 0', fontSize: '0.9rem', fontWeight: 500 }}>
                    {formatearFecha(state.fecha_registro)}
                  </p>
                </div>
              )}
              {state.fecha_limite_respuesta && (
                <div>
                  <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.75rem' }}>Fecha límite de respuesta</p>
                  <p style={{ color: '#374151', margin: '2px 0 0', fontSize: '0.9rem', fontWeight: 500 }}>
                    {formatearFecha(state.fecha_limite_respuesta)}
                  </p>
                </div>
              )}
            </div>
          )}

          <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.8rem' }}>
            Guarda tu código de reclamo para hacer seguimiento.
          </p>

        <CodeplexPila direccion="columna" espaciado={1} sx={{ width: '100%' }}>
            <CodeplexBoton
              texto="Hacer seguimiento de mi reclamo"
              variante="primario"
              alHacerClick={() => navegar(tenantSlug ? `/libro/${tenantSlug}/seguimiento` : '/')}
            />
            <CodeplexBoton
              texto="Registrar otro reclamo"
              variante="enlace"
              alHacerClick={() => navegar(tenantSlug ? `/libro/${tenantSlug}` : '/')}
            />
          </CodeplexPila>
        </CodeplexPila>
      </CodeplexCaja>
    </CodeplexContenedor>
  );
}
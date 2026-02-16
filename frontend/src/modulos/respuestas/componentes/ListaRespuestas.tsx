import { CodeplexTarjeta, CodeplexCargando } from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import { usarRespuestas } from '../ganchos/usarRespuestas';
import { formatoFechaHora } from '@/aplicacion/helpers/formato';

interface Props {
  reclamoId: string;
}

export function ListaRespuestas({ reclamoId }: Props) {
  const { respuestas, cargando } = usarRespuestas(reclamoId);

  if (cargando) return <CodeplexCargando tipo="puntos" etiqueta="Cargando respuestas..." />;
  if (!respuestas.length) return <p style={{ color: '#6b7280' }}>Sin respuestas registradas.</p>;

  return (
    <CodeplexPila direccion="columna" espaciado={2}>
      {respuestas.map((r) => (
        <CodeplexTarjeta key={r.id} variante="contorno">
          <CodeplexPila direccion="columna" espaciado={1}>
            <CodeplexPila direccion="fila" sx={{ justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Respuesta — {r.origen}</span>
              <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{formatoFechaHora(r.fecha_respuesta)}</span>
            </CodeplexPila>
            <p style={{ margin: 0 }}>{r.respuesta_empresa}</p>
            {r.accion_tomada && <p style={{ margin: 0, color: '#6b7280' }}>Acción: {r.accion_tomada}</p>}
            {r.compensacion_ofrecida && <p style={{ margin: 0, color: '#6b7280' }}>Compensación: {r.compensacion_ofrecida}</p>}
          </CodeplexPila>
        </CodeplexTarjeta>
      ))}
    </CodeplexPila>
  );
}

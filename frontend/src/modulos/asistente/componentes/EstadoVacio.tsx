import { CodeplexBoton } from '@codeplex-sac/ui';
import { CodeplexIconoChat } from '@codeplex-sac/icons';

const SUGERENCIAS = [
  '¿Cuántos reclamos tengo pendientes?',
  'Redacta una respuesta para un reclamo vencido',
  '¿Cuál es el plazo legal de INDECOPI?',
  'Prioriza mis casos más urgentes',
];

interface EstadoVacioProps {
  onSugerencia: (texto: string) => void;
  esMovil: boolean;
}

export default function EstadoVacio({ onSugerencia, esMovil }: EstadoVacioProps) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: esMovil ? 12 : 16,
        padding: esMovil ? '16px 12px' : 0,
      }}
    >
      <div
        style={{
          width: esMovil ? 48 : 64,
          height: esMovil ? 48 : 64,
          background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)',
          borderRadius: esMovil ? 12 : 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CodeplexIconoChat style={{ color: '#7c3aed', fontSize: esMovil ? 22 : 28 }} />
      </div>

      <div style={{ textAlign: 'center', maxWidth: esMovil ? 320 : 480 }}>
        <p style={{ fontSize: esMovil ? 14 : 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
          ¿En qué te puedo ayudar?
        </p>
        {!esMovil && (
          <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6 }}>
            Puedo consultar reclamos, redactar respuestas, explicar procesos INDECOPI, analizar
            métricas y asistir en la gestión operativa.
          </p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: esMovil ? 'column' : 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
          maxWidth: esMovil ? 300 : 520,
          marginTop: 8,
          width: esMovil ? '100%' : 'auto',
        }}
      >
        {SUGERENCIAS.map((s) => (
          <CodeplexBoton
            key={s}
            texto={s}
            variante="contorno"
            alHacerClick={() => onSugerencia(s)}
            style={{ fontSize: 12, width: esMovil ? '100%' : 'auto' }}
          />
        ))}
      </div>
    </div>
  );
}
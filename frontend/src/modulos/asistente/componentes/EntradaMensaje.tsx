import { CodeplexBoton, CodeplexCampoTexto } from '@codeplex-sac/ui';

const LIMITE_CARACTERES = 1000;

interface EntradaMensajeProps {
  input: string;
  cargando: boolean;
  esMovil: boolean;
  onInputChange: (valor: string) => void;
  onEnviar: () => void;
}

export default function EntradaMensaje({
  input,
  cargando,
  esMovil,
  onInputChange,
  onEnviar,
}: EntradaMensajeProps) {
  const caracteres = input.length;
  const excedido = caracteres > LIMITE_CARACTERES;
  const porcentaje = Math.min((caracteres / LIMITE_CARACTERES) * 100, 100);

  const colorContador =
    porcentaje >= 100 ? '#ef4444' : porcentaje >= 80 ? '#f59e0b' : '#9ca3af';

  return (
    <div
      style={{
        padding: esMovil ? '10px 12px' : '16px 24px',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-end',
          gap: esMovil ? 8 : 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ maxHeight: 120, overflow: 'auto' }}>
            <CodeplexCampoTexto
              etiqueta=""
              valor={input}
              alCambiar={(e) => onInputChange(e.target.value)}
              marcador="Escribe tu pregunta..."
              multilinea
              filas={esMovil ? 2 : 3}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!excedido) onEnviar();
                }
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 4,
              padding: '0 2px',
            }}
          >
            {excedido ? (
              <span style={{ fontSize: 11, color: '#ef4444' }}>
                Máximo {LIMITE_CARACTERES} caracteres
              </span>
            ) : (
              <span />
            )}
            <span
              style={{
                fontSize: 11,
                color: colorContador,
                fontWeight: porcentaje >= 80 ? 600 : 400,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {caracteres}/{LIMITE_CARACTERES}
            </span>
          </div>
        </div>
        <CodeplexBoton
          texto={esMovil ? '→' : 'Enviar'}
          variante="primario"
          alHacerClick={onEnviar}
          estado={cargando ? 'cargando' : 'inactivo'}
          disabled={!input.trim() || cargando || excedido}
          style={esMovil ? { minWidth: 40, padding: '8px 12px' } : {}}
        />
      </div>
    </div>
  );
}
import { CodeplexBoton } from '@codeplex-sac/ui';
import { CodeplexIconoChat, CodeplexIconoMenu } from '@codeplex-sac/icons';

interface CaberaChatProps {
  titulo: string | undefined;
  totalTokens: number;
  sidebarAbierto: boolean;
  esMovil: boolean;
  onToggleSidebar: () => void;
  onNuevaConversacion: () => void;
}

export default function CabeceraChat({
  titulo,
  totalTokens,
  sidebarAbierto,
  esMovil,
  onToggleSidebar,
  onNuevaConversacion,
}: CaberaChatProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: esMovil ? '10px 12px' : '12px 24px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        flexShrink: 0,
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: esMovil ? 8 : 12, minWidth: 0, flex: 1 }}>
        <CodeplexBoton
          variante="contorno"
          soloIcono
          iconoIzquierda={<CodeplexIconoMenu style={{ fontSize: 18 }} />}
          alHacerClick={onToggleSidebar}
          style={{ minWidth: 32, width: 32, height: 32, flexShrink: 0 }}
          title={sidebarAbierto ? 'Ocultar sidebar' : 'Mostrar sidebar'}
        />

        {!esMovil && (
          <div
            style={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CodeplexIconoChat style={{ color: '#fff', fontSize: 18 }} />
          </div>
        )}

        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: esMovil ? 14 : 16,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {titulo ?? 'Nueva conversación'}
          </h2>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>
            Asistente IA
            {totalTokens > 0 && ` · ${totalTokens.toLocaleString()} tokens`}
          </span>
        </div>
      </div>

      <CodeplexBoton
        texto={esMovil ? '+' : 'Nueva'}
        variante="contorno"
        alHacerClick={onNuevaConversacion}
        style={{ flexShrink: 0 }}
      />
    </div>
  );
}
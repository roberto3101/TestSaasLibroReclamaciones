import { useMemo } from 'react';
import type { MensajeUI } from '@/tipos';

interface BurbujaMensajeProps {
  mensaje: MensajeUI;
}

// ──────────────────────────────────────────────────────────────────────────────
// Parser de markdown ligero (sin dependencias externas)
// ──────────────────────────────────────────────────────────────────────────────

function parsearMarkdown(texto: string): string {
  let html = texto
    // Escapar HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Encabezados
    .replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    // Negritas e itálicas
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Código inline
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    // Líneas horizontales
    .replace(/^---$/gm, '<hr class="md-hr"/>')
    // Listas con viñetas (*, -, •)
    .replace(/^[\s]*[*\-•]\s+(.+)$/gm, '<li class="md-li">$1</li>')
    // Listas numeradas
    .replace(/^[\s]*\d+\.\s+(.+)$/gm, '<li class="md-li-num">$1</li>')
    // Agrupar <li> consecutivos en <ul> o <ol>
    .replace(/((?:<li class="md-li">.*<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>')
    .replace(/((?:<li class="md-li-num">.*<\/li>\n?)+)/g, '<ol class="md-ol">$1</ol>')
    // Párrafos (líneas dobles)
    .replace(/\n\n/g, '</p><p class="md-p">')
    // Saltos simples dentro de párrafos
    .replace(/\n/g, '<br/>');

  // Envolver en párrafo si no empieza con tag de bloque
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<ol')) {
    html = '<p class="md-p">' + html + '</p>';
  }

  return html;
}

// ──────────────────────────────────────────────────────────────────────────────
// Estilos CSS para el markdown renderizado
// ──────────────────────────────────────────────────────────────────────────────

const estilosMarkdown = `
  .md-assistant .md-h2 {
    font-size: 16px;
    font-weight: 700;
    color: #4f46e5;
    margin: 12px 0 6px 0;
    padding-bottom: 4px;
    border-bottom: 1px solid #e5e7eb;
  }
  .md-assistant .md-h3 {
    font-size: 15px;
    font-weight: 700;
    color: #7c3aed;
    margin: 10px 0 4px 0;
  }
  .md-assistant .md-h4 {
    font-size: 14px;
    font-weight: 600;
    color: #6366f1;
    margin: 8px 0 4px 0;
  }
  .md-assistant .md-p {
    margin: 6px 0;
    line-height: 1.6;
  }
  .md-assistant .md-ul,
  .md-assistant .md-ol {
    margin: 6px 0;
    padding-left: 20px;
  }
  .md-assistant .md-li,
  .md-assistant .md-li-num {
    margin: 4px 0;
    line-height: 1.5;
  }
  .md-assistant .md-li::marker {
    color: #6366f1;
  }
  .md-assistant .md-li-num::marker {
    color: #7c3aed;
    font-weight: 600;
  }
  .md-assistant strong {
    color: #1e1b4b;
    font-weight: 600;
  }
  .md-assistant em {
    color: #4338ca;
    font-style: italic;
  }
  .md-assistant .md-code {
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    padding: 1px 5px;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
    color: #dc2626;
  }
  .md-assistant .md-hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 10px 0;
  }
`;

// ──────────────────────────────────────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────────────────────────────────────

export default function BurbujaMensaje({ mensaje: m }: BurbujaMensajeProps) {
  const esUsuario = m.role === 'user';

  const htmlContent = useMemo(() => {
    if (esUsuario) return '';
    return parsearMarkdown(m.content);
  }, [m.content, esUsuario]);

  return (
    <>
      {!esUsuario && <style>{estilosMarkdown}</style>}

      <div
        style={{
          display: 'flex',
          justifyContent: esUsuario ? 'flex-end' : 'flex-start',
          marginBottom: 12,
        }}
      >
        {/* Avatar del asistente */}
        {!esUsuario && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
              marginRight: 10,
              marginTop: 2,
            }}
          >
            IA
          </div>
        )}

        <div
          style={{
            maxWidth: '85%',
            padding: esUsuario ? '10px 16px' : '12px 18px',
            fontSize: 14,
            lineHeight: 1.6,
            borderRadius: esUsuario ? '16px 16px 4px 16px' : '2px 16px 16px 16px',
            backgroundColor: esUsuario ? '#4f46e5' : '#ffffff',
            color: esUsuario ? '#ffffff' : '#1f2937',
            border: esUsuario ? 'none' : '1px solid #e5e7eb',
            boxShadow: esUsuario
              ? '0 1px 3px rgba(79,70,229,0.3)'
              : '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          {esUsuario ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
          ) : (
            <div
              className="md-assistant"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}

          {/* Footer: hora + provider + tokens */}
          <div
            style={{
              fontSize: 10,
              marginTop: 8,
              textAlign: 'right',
              color: esUsuario ? 'rgba(255,255,255,0.6)' : '#9ca3af',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {m.tokens && (
              <span
                style={{
                  background: esUsuario ? 'rgba(255,255,255,0.15)' : '#f3f4f6',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontSize: 9,
                }}
              >
                {m.tokens.prompt + m.tokens.output} tokens
              </span>
            )}
            <span>
              {m.timestamp.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
              {m.provider && ` · ${m.provider}`}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
import { CodeplexTarjeta, CodeplexProgreso } from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';

interface Props {
  titulo: string;
  valor: number;
  limite: number;
  icono: string;
}

export function TarjetaUso({ titulo, valor, limite, icono }: Props) {
  const porcentaje = limite > 0 ? Math.round((valor / limite) * 100) : 0;
  const variante = porcentaje >= 90 ? 'error' as const : porcentaje >= 70 ? 'advertencia' as const : 'primario' as const;

  return (
    <CodeplexTarjeta efectoHover>
      <CodeplexPila direccion="columna" espaciado={1}>
        <CodeplexPila direccion="fila" espaciado={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{titulo}</span>
          <span style={{ fontSize: '1.5rem' }}>{icono}</span>
        </CodeplexPila>
        <span style={{ fontSize: '2rem', fontWeight: 700 }}>
          {valor} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#9ca3af' }}>/ {limite}</span>
        </span>
        <CodeplexProgreso valor={porcentaje} variante={variante} tamano="sm" />
      </CodeplexPila>
    </CodeplexTarjeta>
  );
}
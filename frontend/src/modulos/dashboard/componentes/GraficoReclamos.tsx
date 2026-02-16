import { CodeplexBarChart } from '@codeplex-sac/charts';
import { CodeplexTarjeta } from '@codeplex-sac/ui';

export function GraficoReclamos() {
  return (
    <CodeplexTarjeta titulo="Reclamos por Mes">
      <CodeplexBarChart
        title=""
        height={320}
        series={[
          { data: [12, 19, 8, 15, 22, 10], label: 'Reclamos' },
          { data: [3, 7, 2, 5, 8, 4], label: 'Quejas' },
        ]}
        xAxis={[{ data: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'], scaleType: 'band' }]}
      />
    </CodeplexTarjeta>
  );
}
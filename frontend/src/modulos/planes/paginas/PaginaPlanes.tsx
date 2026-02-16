import { CodeplexCuadricula, CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexCargando } from '@codeplex-sac/ui';
import { usarPlanes } from '../ganchos/usarPlanes';
import { TarjetaPlan } from '../componentes/TarjetaPlan';

export default function PaginaPlanes() {
  const { planes, cargando } = usarPlanes();

  if (cargando) return <CodeplexCargando tipo="anillo" etiqueta="Cargando planes..." pantallaCompleta />;

  return (
    <CodeplexPila direccion="columna" espaciado={3}>
      <h2 style={{ margin: 0 }}>Planes Disponibles</h2>
      <CodeplexCuadricula contenedor espaciado={3}>
        {planes.map((plan) => (
          <CodeplexCuadricula key={plan.id} elemento tamano={{ xs: 12, sm: 6, md: 4 }}>
            <TarjetaPlan plan={plan} />
          </CodeplexCuadricula>
        ))}
      </CodeplexCuadricula>
    </CodeplexPila>
  );
}

import { CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexBoton } from '@codeplex-sac/ui';
import { CodeplexIconoRefrescar } from '@codeplex-sac/icons';
import { usarReclamos } from '../ganchos/usarReclamos';
import { TablaReclamos } from '../componentes/TablaReclamos';

export default function PaginaReclamos() {
  const { datos, cargando, pagina, cambiarPagina, recargar } = usarReclamos();

  return (
    <CodeplexPila direccion="columna" espaciado={3}>
      <CodeplexPila direccion="fila" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Gestión de Reclamos</h2>
        <CodeplexBoton
          texto="Actualizar"
          variante="contorno"
          iconoIzquierda={<CodeplexIconoRefrescar />}
          alHacerClick={recargar}
        />
      </CodeplexPila>

      <TablaReclamos
        reclamos={datos?.data ?? []}
        total={datos?.total_pages ?? 0}
        pagina={pagina}
        cargando={cargando}
        alCambiarPagina={cambiarPagina}
      />
    </CodeplexPila>
  );
}

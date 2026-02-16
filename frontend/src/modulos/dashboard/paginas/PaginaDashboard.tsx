import { CodeplexCuadricula, CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexCargando } from '@codeplex-sac/ui';
import { usarDashboard } from '../ganchos/usarDashboard';
import { TarjetaUso } from '../componentes/TarjetaUso';
import { GraficoReclamos } from '../componentes/GraficoReclamos';

export default function PaginaDashboard() {
  const { uso, cargando } = usarDashboard();

  if (cargando || !uso) {
    return <CodeplexCargando tipo="anillo" etiqueta="Cargando dashboard..." pantallaCompleta />;
  }

  const tarjetas = [
    {
      titulo: 'Reclamos este Mes',
      valor: uso.reclamos_mes,
      limite: uso.limite_reclamos_mes,
      icono: '📋',
    },
    {
      titulo: 'Usuarios Activos',
      valor: uso.usuarios_activos,
      limite: uso.limite_usuarios,
      icono: '👥',
    },
    {
      titulo: 'Sedes Activas',
      valor: uso.sedes_activas,
      limite: uso.limite_sedes,
      icono: '🏢',
    },
    {
      titulo: 'Chatbots Activos',
      valor: uso.chatbots_activos,
      limite: uso.limite_chatbots,
      icono: '🤖',
    },
  ];

  return (
    <CodeplexPila direccion="columna" espaciado={3}>
      <h2 style={{ margin: 0 }}>Dashboard — Plan {uso.plan_nombre}</h2>

      <CodeplexCuadricula contenedor espaciado={3}>
        {tarjetas.map((t) => (
          <CodeplexCuadricula key={t.titulo} elemento tamano={{ xs: 12, sm: 6, md: 3 }}>
            <TarjetaUso {...t} />
          </CodeplexCuadricula>
        ))}
      </CodeplexCuadricula>

      <GraficoReclamos />
    </CodeplexPila>
  );
}

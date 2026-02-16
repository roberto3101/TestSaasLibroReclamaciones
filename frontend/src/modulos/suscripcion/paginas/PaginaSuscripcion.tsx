import { CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexTarjeta, CodeplexBoton, CodeplexCargando, CodeplexInsignia } from '@codeplex-sac/ui';
import { usarSuscripcion } from '../ganchos/usarSuscripcion';
import { suscripcionApi } from '../api/suscripcion.api';
import { confirmar } from '@/aplicacion/helpers/confirmar';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import { formatoFecha } from '@/aplicacion/helpers/formato';

export default function PaginaSuscripcion() {
  const { suscripcion, cargando, recargar } = usarSuscripcion();

  if (cargando) return <CodeplexCargando tipo="anillo" etiqueta="Cargando suscripción..." pantallaCompleta />;

  const cancelar = async () => {
    const confirmado = await confirmar({
      titulo: '¿Cancelar suscripción?',
      texto: 'Perderás el acceso a las funcionalidades del plan actual.',
      icono: 'warning',
    });
    if (!confirmado) return;
    try {
      await suscripcionApi.cancelar();
      notificar.exito('Suscripción cancelada');
      recargar();
    } catch (error) {
      manejarError(error);
    }
  };

  if (!suscripcion) {
    return (
      <CodeplexPila direccion="columna" espaciado={3}>
        <h2 style={{ margin: 0 }}>Suscripción</h2>
        <CodeplexTarjeta>
          <p>No tienes una suscripción activa. Ve a la sección de Planes para activar una.</p>
          <CodeplexBoton texto="Ver Planes" variante="primario" alHacerClick={() => window.location.href = '/planes'} />
        </CodeplexTarjeta>
      </CodeplexPila>
    );
  }

  return (
    <CodeplexPila direccion="columna" espaciado={3}>
      <h2 style={{ margin: 0 }}>Mi Suscripción</h2>
      <CodeplexTarjeta>
        <CodeplexPila direccion="columna" espaciado={2}>
          <CodeplexPila direccion="fila" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>Estado</span>
            <CodeplexInsignia
              contenido={suscripcion.estado}
              color={suscripcion.estado === 'ACTIVA' ? 'exito' : 'advertencia'}
            />
          </CodeplexPila>
          <Campo etiqueta="Ciclo" valor={suscripcion.ciclo} />
          <Campo etiqueta="Fecha Inicio" valor={formatoFecha(suscripcion.fecha_inicio)} />
          <Campo etiqueta="Fecha Fin" valor={formatoFecha(suscripcion.fecha_fin)} />
          <Campo etiqueta="Próximo Cobro" valor={formatoFecha(suscripcion.fecha_proximo_cobro)} />
          {suscripcion.es_trial && <Campo etiqueta="Fin Trial" valor={formatoFecha(suscripcion.fecha_fin_trial)} />}

          <CodeplexBoton texto="Cancelar Suscripción" variante="peligro" alHacerClick={cancelar} />
        </CodeplexPila>
      </CodeplexTarjeta>
    </CodeplexPila>
  );
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  return (
    <div>
      <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#6b7280' }}>{etiqueta}</span>
      <p style={{ margin: '2px 0 0' }}>{valor || '—'}</p>
    </div>
  );
}

import { CodeplexTarjeta, CodeplexBoton, CodeplexInsignia } from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexIconoExito } from '@codeplex-sac/icons';
import type { Plan } from '@/tipos';
import { formatoMoneda } from '@/aplicacion/helpers/formato';

interface Props {
  plan: Plan;
}

export function TarjetaPlan({ plan }: Props) {
  const caracteristicas = [
    `${plan.max_sedes} sedes`,
    `${plan.max_usuarios} usuarios`,
    `${plan.max_reclamos_mes} reclamos/mes`,
    plan.permite_chatbot ? `${plan.max_chatbots} chatbots` : null,
    plan.permite_whatsapp ? 'WhatsApp' : null,
    plan.permite_email ? 'Notificaciones Email' : null,
    plan.permite_reportes_pdf ? 'Reportes PDF' : null,
    plan.permite_exportar_excel ? 'Exportar Excel' : null,
    plan.permite_api ? 'Acceso API' : null,
  ].filter(Boolean) as string[];

  return (
    <CodeplexTarjeta efectoHover>
      <CodeplexPila direccion="columna" espaciado={2} sx={{ textAlign: 'center' }}>
        {plan.destacado && <CodeplexInsignia contenido="Recomendado" color="primario" />}
        <h3 style={{ margin: 0 }}>{plan.nombre}</h3>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>{plan.descripcion}</p>
        <div>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>{formatoMoneda(plan.precio_mensual)}</span>
          <span style={{ color: '#9ca3af' }}>/mes</span>
        </div>
        <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.8rem' }}>
          Anual: {formatoMoneda(plan.precio_anual)}/año
        </p>

        <CodeplexPila direccion="columna" espaciado={0.5} sx={{ textAlign: 'left' }}>
          {caracteristicas.map((c) => (
            <CodeplexPila key={c} direccion="fila" espaciado={1} sx={{ alignItems: 'center' }}>
              <CodeplexIconoExito sx={{ fontSize: 16, color: 'success.main' }} />
              <span style={{ fontSize: '0.85rem' }}>{c}</span>
            </CodeplexPila>
          ))}
        </CodeplexPila>

        <CodeplexBoton
          texto="Seleccionar Plan"
          variante={plan.destacado ? 'primario' : 'contorno'}
          sx={{ width: '100%' }}
        />
      </CodeplexPila>
    </CodeplexTarjeta>
  );
}
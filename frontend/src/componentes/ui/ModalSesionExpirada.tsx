import { CodeplexModal } from '@codeplex-sac/utils';
import { CodeplexBoton } from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexIconoAlerta } from '@codeplex-sac/icons';
import { usarEstadoUI } from '@/aplicacion/estado/estadoUI';
import { usarEstadoAuth } from '@/aplicacion/estado/estadoAuth';

export function ModalSesionExpirada() {
  const { modalSesionExpirada, ocultarSesionExpirada } = usarEstadoUI();
  const { cerrarSesion } = usarEstadoAuth();

  const manejarCerrar = () => {
    ocultarSesionExpirada();
    cerrarSesion();
    window.location.href = '/acceso';
  };

  return (
    <CodeplexModal
      open={modalSesionExpirada}
      onClose={manejarCerrar}
      title="Sesión Expirada"
      locked
      maxWidth="xs"
      footer={
        <CodeplexBoton texto="Iniciar Sesión" variante="primario" alHacerClick={manejarCerrar} />
      }
    >
      <CodeplexPila direccion="columna" espaciado={2} sx={{ alignItems: 'center', py: 2 }}>
        <CodeplexIconoAlerta sx={{ fontSize: 48, color: 'warning.main' }} />
        <span>Tu sesión ha expirado. Por favor, inicia sesión nuevamente.</span>
      </CodeplexPila>
    </CodeplexModal>
  );
}

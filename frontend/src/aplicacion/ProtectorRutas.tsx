import { Navigate, useLocation } from 'react-router-dom';
import { CodeplexCargando } from '@codeplex-sac/ui';
import { CodeplexCaja } from '@codeplex-sac/layout';
import { usarEstadoAuth } from '@/aplicacion/estado/estadoAuth';
import type { RolUsuario } from '@/tipos';

interface Props {
  children: React.ReactNode;
  rolesPermitidos?: RolUsuario[];
}

export default function ProtectorRutas({ children, rolesPermitidos }: Props) {
  const { autenticado, cargando, usuario } = usarEstadoAuth();
  const ubicacion = useLocation();

  if (cargando) {
    return (
      <CodeplexCaja centrado sx={{ minHeight: '100vh' }}>
        <CodeplexCargando tipo="anillo" etiqueta="Cargando..." />
      </CodeplexCaja>
    );
  }

  if (!autenticado) {
    return <Navigate to="/acceso" state={{ desde: ubicacion }} replace />;
  }

  if (rolesPermitidos && usuario && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

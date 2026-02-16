import { useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CodeplexEsqueleto, CodeplexCabecera, CodeplexBarraLateral } from '@codeplex-sac/layout';
import {
  CodeplexIconoDiseno,
  CodeplexIconoCaja,
  CodeplexIconoUsuario,
  CodeplexIconoEdificio,
  CodeplexIconoChat,
  CodeplexIconoLlave,
  CodeplexIconoMoneda,
  CodeplexIconoHerramientas,
} from '@codeplex-sac/icons';
import { usarEstadoAuth } from '@/aplicacion/estado/estadoAuth';
import { usarEstadoUI } from '@/aplicacion/estado/estadoUI';
import { ModalSesionExpirada } from '@/componentes/ui/ModalSesionExpirada';

export default function LayoutPrincipal() {
  const { usuario } = usarEstadoAuth();
  const { barraLateralColapsada, alternarBarraLateral } = usarEstadoUI();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  const elementosMenu = useMemo(
    () => [
      {
        id: 'dashboard',
        etiqueta: 'Dashboard',
        icono: <CodeplexIconoDiseno />,
        activo: ubicacion.pathname === '/dashboard',
        alHacerClick: () => navegar('/dashboard'),
      },
      {
        id: 'reclamos',
        etiqueta: 'Reclamos',
        icono: <CodeplexIconoCaja />,
        activo: ubicacion.pathname.startsWith('/reclamos'),
        alHacerClick: () => navegar('/reclamos'),
      },
      {
        id: 'usuarios',
        etiqueta: 'Usuarios',
        icono: <CodeplexIconoUsuario />,
        activo: ubicacion.pathname.startsWith('/usuarios'),
        alHacerClick: () => navegar('/usuarios'),
      },
      {
        id: 'sedes',
        etiqueta: 'Sedes',
        icono: <CodeplexIconoEdificio />,
        activo: ubicacion.pathname.startsWith('/sedes'),
        alHacerClick: () => navegar('/sedes'),
      },
      {
        id: 'chatbots',
        etiqueta: 'Chatbots',
        icono: <CodeplexIconoChat />,
        activo: ubicacion.pathname.startsWith('/chatbots'),
        alHacerClick: () => navegar('/chatbots'),
      },
      {
        id: 'planes',
        etiqueta: 'Planes',
        icono: <CodeplexIconoMoneda />,
        activo: ubicacion.pathname.startsWith('/planes'),
        alHacerClick: () => navegar('/planes'),
      },
      {
        id: 'suscripcion',
        etiqueta: 'Suscripción',
        icono: <CodeplexIconoLlave />,
        activo: ubicacion.pathname.startsWith('/suscripcion'),
        alHacerClick: () => navegar('/suscripcion'),
      },
      {
        id: 'configuracion',
        etiqueta: 'Configuración',
        icono: <CodeplexIconoHerramientas />,
        activo: ubicacion.pathname.startsWith('/configuracion'),
        alHacerClick: () => navegar('/configuracion'),
      },
    ],
    [ubicacion.pathname, navegar],
  );

  return (
    <>
      <CodeplexEsqueleto menu={elementosMenu} titulo="Libro de Reclamaciones">
        <CodeplexCabecera
          usuario={{
            nombre: usuario?.nombre_completo ?? '',
            rol: usuario?.rol ?? '',
          }}
        />
        <CodeplexBarraLateral
          elementos={elementosMenu}
          colapsado={barraLateralColapsada}
          alAlternar={alternarBarraLateral}
        />
        <Outlet />
      </CodeplexEsqueleto>
      <ModalSesionExpirada />
    </>
  );
}
import { useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CodeplexEsqueleto, CodeplexCabecera, CodeplexBarraLateral } from '@codeplex-sac/layout';
import { CodeplexModal } from '@codeplex-sac/utils';
import { CodeplexBoton } from '@codeplex-sac/ui';
import {
  CodeplexIconoDiseno,
  CodeplexIconoCaja,
  CodeplexIconoUsuario,
  CodeplexIconoEdificio,
  CodeplexIconoChat,
  CodeplexIconoLlave,
  CodeplexIconoMoneda,
  CodeplexIconoHerramientas,
  CodeplexIconoLibro,
} from '@codeplex-sac/icons';
import { usarEstadoAuth } from '@/aplicacion/estado/estadoAuth';
import { usarEstadoUI } from '@/aplicacion/estado/estadoUI';
import { ModalSesionExpirada } from '@/componentes/ui/ModalSesionExpirada';
import { ModalSedesPublicas } from '@/componentes/ui/ModalSedesPublicas';
import { limpiarSesion } from '@/aplicacion/helpers/sesion';

export default function LayoutPrincipal() {
  const { usuario } = usarEstadoAuth();
  const { barraLateralColapsada, alternarBarraLateral } = usarEstadoUI();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [modalSedesAbierto, setModalSedesAbierto] = useState(false);
  const [modalPerfilAbierto, setModalPerfilAbierto] = useState(false);

  const manejarCerrarSesion = () => {
    limpiarSesion();
    navegar('/acceso');
  };

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
        id: 'libro-publico',
        etiqueta: 'Libro Público',
        icono: <CodeplexIconoLibro />,
        activo: false,
        alHacerClick: () => setModalSedesAbierto(true),
      },
      {
        id: 'seguimiento-publico',
        etiqueta: 'Seguimiento Público',
        icono: <CodeplexIconoLibro />,
        activo: false,
        alHacerClick: () => navegar(`/libro/${usuario?.tenant_slug}/seguimiento`),
      },
      {
        id: 'chatbots',
        etiqueta: 'Chatbots',
        icono: <CodeplexIconoChat />,
        activo: ubicacion.pathname.startsWith('/chatbots'),
        alHacerClick: () => navegar('/chatbots'),
      },
      // ── NUEVO: Asistente IA ──
      {
        id: 'asistente',
        etiqueta: 'Asistente IA',
        icono: <CodeplexIconoChat />,
        activo: ubicacion.pathname.startsWith('/asistente'),
        alHacerClick: () => navegar('/asistente'),
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
    [ubicacion.pathname, navegar, usuario],
  );

  return (
    <>
      <CodeplexEsqueleto menu={elementosMenu} titulo="Libro de Reclamaciones">
        <CodeplexCabecera
          usuario={{
            nombre: usuario?.nombre_completo ?? '',
            rol: usuario?.rol ?? '',
          }}
          alPerfil={() => setModalPerfilAbierto(true)}
        />
        <CodeplexBarraLateral
          elementos={elementosMenu}
          colapsado={barraLateralColapsada}
          alAlternar={alternarBarraLateral}
        />
        <Outlet />
      </CodeplexEsqueleto>
      <ModalSesionExpirada />
      {modalSedesAbierto && (
        <ModalSedesPublicas
          abierto={modalSedesAbierto}
          alCerrar={() => setModalSedesAbierto(false)}
        />
      )}
      {modalPerfilAbierto && (
        <CodeplexModal
          open={modalPerfilAbierto}
          onClose={() => setModalPerfilAbierto(false)}
          title="Mi Perfil"
          maxWidth="xs"
        >
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <p>
              <strong>{usuario?.nombre_completo}</strong>
            </p>
            <p style={{ color: '#666', marginBottom: '24px' }}>{usuario?.rol}</p>
            <CodeplexBoton
              texto="Cerrar Sesión"
              variante="primario"
              alHacerClick={manejarCerrarSesion}
              style={{ width: '100%' }}
            />
          </div>
        </CodeplexModal>
      )}
    </>
  );
}
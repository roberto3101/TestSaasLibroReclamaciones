import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CodeplexCargando } from '@codeplex-sac/ui';
import { CodeplexCaja } from '@codeplex-sac/layout';
import ProtectorRutas from './ProtectorRutas';
import LayoutPrincipal from './layouts/LayoutPrincipal';
import LayoutPublico from './layouts/LayoutPublico';

// ── Lazy imports ──
const PaginaLogin = lazy(() => import('@/paginas/acceso/PaginaLogin'));
const PaginaDashboard = lazy(() => import('@/modulos/dashboard/paginas/PaginaDashboard'));
const PaginaReclamos = lazy(() => import('@/modulos/reclamos/paginas/PaginaReclamos'));
const PaginaDetalleReclamo = lazy(() => import('@/modulos/reclamos/paginas/PaginaDetalleReclamo'));
const PaginaUsuarios = lazy(() => import('@/modulos/usuarios/paginas/PaginaUsuarios'));
const PaginaSedes = lazy(() => import('@/modulos/sedes/paginas/PaginaSedes'));
const PaginaChatbots = lazy(() => import('@/modulos/chatbots/paginas/PaginaChatbots'));
const PaginaDetalleChatbot = lazy(() => import('@/modulos/chatbots/paginas/PaginaDetalleChatbot'));
const PaginaPlanes = lazy(() => import('@/modulos/planes/paginas/PaginaPlanes'));
const PaginaSuscripcion = lazy(() => import('@/modulos/suscripcion/paginas/PaginaSuscripcion'));
const PaginaConfigTenant = lazy(() => import('@/modulos/tenant/paginas/PaginaConfigTenant'));
const PaginaLibroPublico = lazy(() => import('@/modulos/libro-publico/paginas/PaginaLibroPublico'));
const PaginaConfirmacion = lazy(() => import('@/modulos/libro-publico/paginas/PaginaConfirmacion'));
const Pagina404 = lazy(() => import('@/paginas/no-encontrado/Pagina404'));

function CargaFallback() {
  return (
    <CodeplexCaja centrado sx={{ minHeight: '60vh' }}>
      <CodeplexCargando tipo="anillo" etiqueta="Cargando módulo..." />
    </CodeplexCaja>
  );
}

export default function Enrutador() {
  return (
    <Suspense fallback={<CargaFallback />}>
      <Routes>
        {/* Rutas públicas */}
        <Route element={<LayoutPublico />}>
          <Route path="/acceso" element={<PaginaLogin />} />
          <Route path="/libro/:tenantSlug" element={<PaginaLibroPublico />} />
          <Route path="/libro/:tenantSlug/confirmacion" element={<PaginaConfirmacion />} />
        </Route>

        {/* Rutas protegidas */}
        <Route
          element={
            <ProtectorRutas>
              <LayoutPrincipal />
            </ProtectorRutas>
          }
        >
          <Route path="/dashboard" element={<PaginaDashboard />} />
          <Route path="/reclamos" element={<PaginaReclamos />} />
          <Route path="/reclamos/:id" element={<PaginaDetalleReclamo />} />
          <Route path="/usuarios" element={<PaginaUsuarios />} />
          <Route path="/sedes" element={<PaginaSedes />} />
          <Route path="/chatbots" element={<PaginaChatbots />} />
          <Route path="/chatbots/:id" element={<PaginaDetalleChatbot />} />
          <Route path="/planes" element={<PaginaPlanes />} />
          <Route path="/suscripcion" element={<PaginaSuscripcion />} />
          <Route path="/configuracion" element={<PaginaConfigTenant />} />
        </Route>

        {/* Redirects y 404 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Pagina404 />} />
      </Routes>
    </Suspense>
  );
}
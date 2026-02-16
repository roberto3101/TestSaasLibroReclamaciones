import { useState, useEffect } from 'react';
import { usarSedes } from '../ganchos/usarSedes';
import { TablaSedes } from '../componentes/TablaSedes';
import { FormSede } from '../componentes/FormSede';
import { http } from '@/api/http';
import type { Sede, ApiResponse } from '@/tipos';

export default function PaginaSedes() {
  const { sedes, cargando, recargar } = usarSedes();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [sedeEditar, setSedeEditar] = useState<Sede | null>(null);
  const [tenantSlug, setTenantSlug] = useState('');

  // Cargar slug del tenant para construir URLs del libro público
  useEffect(() => {
    http
      .get<ApiResponse<{ slug: string }>>('/tenant')
      .then((r) => setTenantSlug(r.data.data.slug))
      .catch(() => {});
  }, []);

  const abrirCrear = () => {
    setSedeEditar(null);
    setMostrarForm(true);
  };

  const abrirEditar = (sede: Sede) => {
    setSedeEditar(sede);
    setMostrarForm(true);
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setSedeEditar(null);
  };

  const alGuardar = () => {
    cerrarForm();
    recargar();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestión de Sedes</h2>
          <p className="mt-1 text-sm text-gray-500">
            Administra los establecimientos físicos de tu empresa
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Sede
        </button>
      </div>

      {/* Tabla */}
      <TablaSedes
        sedes={sedes}
        cargando={cargando}
        alRecargar={recargar}
        alEditar={abrirEditar}
        tenantSlug={tenantSlug}
      />

      {/* Modal crear/editar */}
      <FormSede
        abierto={mostrarForm}
        alCerrar={cerrarForm}
        alGuardar={alGuardar}
        sedeEditar={sedeEditar}
      />
    </div>
  );
}
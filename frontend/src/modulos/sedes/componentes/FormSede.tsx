import { useState, useEffect, useCallback } from 'react';
import { sedesApi } from '../api/sedes.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import type { Sede } from '@/tipos';

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  alGuardar: () => void;
  sedeEditar?: Sede | null;
}

interface HorarioDia {
  dia: string;
  inicio: string;
  fin: string;
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const FORM_INICIAL = {
  nombre: '',
  slug: '',
  codigo_sede: '',
  direccion: '',
  departamento: '',
  provincia: '',
  distrito: '',
  referencia: '',
  telefono: '',
  email: '',
  responsable_nombre: '',
  responsable_cargo: '',
  latitud: '',
  longitud: '',
  es_principal: false,
};

export function FormSede({ abierto, alCerrar, alGuardar, sedeEditar }: Props) {
  const [form, setForm] = useState(FORM_INICIAL);
  const [horarios, setHorarios] = useState<HorarioDia[]>([]);
  const [cargando, setCargando] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  const esEdicion = !!sedeEditar;

  // Poblar formulario al editar
  useEffect(() => {
    if (abierto && sedeEditar) {
      setForm({
        nombre: sedeEditar.nombre || '',
        slug: sedeEditar.slug || '',
        codigo_sede: sedeEditar.codigo_sede || '',
        direccion: sedeEditar.direccion || '',
        departamento: sedeEditar.departamento || '',
        provincia: sedeEditar.provincia || '',
        distrito: sedeEditar.distrito || '',
        referencia: sedeEditar.referencia || '',
        telefono: sedeEditar.telefono || '',
        email: sedeEditar.email || '',
        responsable_nombre: sedeEditar.responsable_nombre || '',
        responsable_cargo: sedeEditar.responsable_cargo || '',
        latitud: sedeEditar.latitud != null ? String(sedeEditar.latitud) : '',
        longitud: sedeEditar.longitud != null ? String(sedeEditar.longitud) : '',
        es_principal: sedeEditar.es_principal || false,
      });
      // Parsear horario_atencion
      try {
        const h = sedeEditar.horario_atencion;
        if (h && typeof h === 'string') {
          const parsed = JSON.parse(h);
          setHorarios(Array.isArray(parsed) ? parsed : []);
        } else if (Array.isArray(h)) {
          setHorarios(h as HorarioDia[]);
        } else {
          setHorarios([]);
        }
      } catch {
        setHorarios([]);
      }
      setAutoSlug(false);
    } else if (abierto) {
      setForm(FORM_INICIAL);
      setHorarios([]);
      setAutoSlug(true);
    }
  }, [abierto, sedeEditar]);

  const generarSlug = useCallback((texto: string) => {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }, []);

  const actualizar = (campo: string, valor: string | boolean) => {
    setForm((p) => {
      const next = { ...p, [campo]: valor };
      // Auto-generar slug a partir del nombre
      if (campo === 'nombre' && autoSlug && typeof valor === 'string') {
        next.slug = generarSlug(valor);
      }
      if (campo === 'slug') {
        setAutoSlug(false);
      }
      return next;
    });
  };

  // ── Horarios ──
  const agregarHorario = () => {
    if (horarios.length >= 7) return;
    const diasUsados = new Set(horarios.map((h) => h.dia));
    const siguienteDia = DIAS_SEMANA.find((d) => !diasUsados.has(d)) || DIAS_SEMANA[0];
    setHorarios([...horarios, { dia: siguienteDia, inicio: '08:00', fin: '18:00' }]);
  };

  const actualizarHorario = (index: number, campo: keyof HorarioDia, valor: string) => {
    setHorarios((prev) => prev.map((h, i) => (i === index ? { ...h, [campo]: valor } : h)));
  };

  const eliminarHorario = (index: number) => {
    setHorarios((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Guardar ──
  const manejarGuardar = async () => {
    if (!form.nombre.trim() || !form.slug.trim() || !form.direccion.trim()) {
      notificar.advertencia('Nombre, slug y dirección son obligatorios');
      return;
    }

    setCargando(true);
    try {
      const lat = form.latitud ? parseFloat(form.latitud) : null;
      const lon = form.longitud ? parseFloat(form.longitud) : null;

      const payload: any = {
        ...form,
        latitud: lat && !isNaN(lat) ? Math.round(lat * 10000000) / 10000000 : null,
        longitud: lon && !isNaN(lon) ? Math.round(lon * 10000000) / 10000000 : null,
        horario_atencion: horarios.length > 0 ? horarios : [],
      };

      if (esEdicion && sedeEditar) {
        await sedesApi.actualizar(sedeEditar.id, payload);
        notificar.exito('Sede actualizada exitosamente');
      } else {
        await sedesApi.crear(payload);
        notificar.exito('Sede creada exitosamente');
      }
      alGuardar();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {esEdicion ? 'Editar Sede' : 'Nueva Sede'}
          </h2>
          <button
            onClick={alCerrar}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">
          {/* ── Sección: Información básica ── */}
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-3">Información básica</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo etiqueta="Nombre *" valor={form.nombre} onChange={(v) => actualizar('nombre', v)} placeholder="Sede Miraflores" />
              <Campo etiqueta="Slug *" valor={form.slug} onChange={(v) => actualizar('slug', v)} placeholder="miraflores" mono />
              <Campo etiqueta="Código de sede" valor={form.codigo_sede} onChange={(v) => actualizar('codigo_sede', v)} placeholder="S001" />
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="es_principal"
                  checked={form.es_principal}
                  onChange={(e) => actualizar('es_principal', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="es_principal" className="text-sm text-gray-700">
                  Sede principal
                </label>
              </div>
            </div>
          </fieldset>

          {/* ── Sección: Dirección ── */}
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-3">Dirección</legend>
            <div className="grid grid-cols-1 gap-4">
              <Campo etiqueta="Dirección *" valor={form.direccion} onChange={(v) => actualizar('direccion', v)} placeholder="Av. Larco 1234" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Campo etiqueta="Departamento" valor={form.departamento} onChange={(v) => actualizar('departamento', v)} placeholder="Lima" />
                <Campo etiqueta="Provincia" valor={form.provincia} onChange={(v) => actualizar('provincia', v)} placeholder="Lima" />
                <Campo etiqueta="Distrito" valor={form.distrito} onChange={(v) => actualizar('distrito', v)} placeholder="Miraflores" />
              </div>
              <Campo etiqueta="Referencia" valor={form.referencia} onChange={(v) => actualizar('referencia', v)} placeholder="Frente al parque Kennedy" />
            </div>
          </fieldset>

          {/* ── Sección: Contacto ── */}
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-3">Contacto</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo etiqueta="Teléfono" valor={form.telefono} onChange={(v) => actualizar('telefono', v)} placeholder="+51 999 888 777" />
              <Campo etiqueta="Email" valor={form.email} onChange={(v) => actualizar('email', v)} placeholder="sede@empresa.com" tipo="email" />
              <Campo etiqueta="Responsable" valor={form.responsable_nombre} onChange={(v) => actualizar('responsable_nombre', v)} placeholder="Juan Pérez" />
              <Campo etiqueta="Cargo" valor={form.responsable_cargo} onChange={(v) => actualizar('responsable_cargo', v)} placeholder="Administrador" />
            </div>
          </fieldset>

          {/* ── Sección: Geolocalización ── */}
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-3">Geolocalización</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo etiqueta="Latitud" valor={form.latitud} onChange={(v) => actualizar('latitud', v)} placeholder="-12.1191" tipo="number" />
              <Campo etiqueta="Longitud" valor={form.longitud} onChange={(v) => actualizar('longitud', v)} placeholder="-77.0373" tipo="number" />
            </div>
          </fieldset>

          {/* ── Sección: Horario de atención ── */}
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-3">Horario de atención</legend>
            {horarios.length === 0 ? (
              <p className="text-sm text-gray-500 mb-3">No hay horarios configurados.</p>
            ) : (
              <div className="space-y-2 mb-3">
                {horarios.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={h.dia}
                      onChange={(e) => actualizarHorario(i, 'dia', e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 flex-1"
                    >
                      {DIAS_SEMANA.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={h.inicio}
                      onChange={(e) => actualizarHorario(i, 'inicio', e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-400 text-sm">a</span>
                    <input
                      type="time"
                      value={h.fin}
                      onChange={(e) => actualizarHorario(i, 'fin', e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => eliminarHorario(i)}
                      className="text-red-400 hover:text-red-600 p-1 transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {horarios.length < 7 && (
              <button
                type="button"
                onClick={agregarHorario}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar horario
              </button>
            )}
          </fieldset>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={alCerrar}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={manejarGuardar}
            disabled={cargando}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {cargando && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {esEdicion ? 'Guardar cambios' : 'Crear Sede'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente campo reutilizable ──

function Campo({
  etiqueta,
  valor,
  onChange,
  placeholder,
  tipo = 'text',
  mono = false,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tipo?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{etiqueta}</label>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow ${
          mono ? 'font-mono' : ''
        }`}
      />
    </div>
  );
}
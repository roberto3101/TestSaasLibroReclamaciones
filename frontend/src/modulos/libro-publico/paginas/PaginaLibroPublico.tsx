import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CodeplexPila, CodeplexCaja, CodeplexContenedor } from '@codeplex-sac/layout';
import { CodeplexCargando, CodeplexAlerta, CodeplexBoton } from '@codeplex-sac/ui';
import { CodeplexPasos } from '@codeplex-sac/navigation';
import type { Tenant, Sede, CrearReclamoRequest } from '@/tipos';
import { publicoApi } from '../api/publico.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import { PasoConsumidor } from '../componentes/PasoConsumidor';
import { PasoBien } from '../componentes/PasoBien';
import { PasoDetalle } from '../componentes/PasoDetalle';

const PASOS = [
  { etiqueta: 'Datos Personales', descripcion: 'Información del consumidor' },
  { etiqueta: 'Bien Contratado', descripcion: 'Producto o servicio' },
  { etiqueta: 'Detalle y Firma', descripcion: 'Descripción y firma digital' },
];

export default function PaginaLibroPublico() {
  // Soporta ambas rutas:
  //   /libro-publico/:tenantSlug          (empresa con 1 sede)
  //   /libro-publico/:tenantSlug/:sedeSlug (empresa multi-sede)
  const { tenantSlug, sedeSlug } = useParams<{ tenantSlug: string; sedeSlug?: string }>();
  const navegar = useNavigate();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pasoActivo, setPasoActivo] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const [form, setForm] = useState<Partial<CrearReclamoRequest>>({
    tipo_solicitud: 'RECLAMO',
    menor_de_edad: false,
    acepta_terminos: false,
    acepta_copia: false,
  });

  useEffect(() => {
    if (!tenantSlug) return;

    Promise.all([
      publicoApi.obtenerTenant(tenantSlug),
      publicoApi.obtenerSedes(tenantSlug),
    ])
      .then(([t, s]) => {
        setTenant(t);
        setSedes(s || []);

        // Si viene sedeSlug en la URL, auto-seleccionar esa sede
        if (sedeSlug) {
          const sedeExiste = (s || []).some((sede: Sede) => sede.slug === sedeSlug);
          if (sedeExiste) {
            setForm((prev) => ({ ...prev, sede_slug: sedeSlug }));
          }
        }
      })
      .catch((e) => {
        manejarError(e);
      })
      .finally(() => {
        setCargando(false);
      });
  }, [tenantSlug, sedeSlug]);

  const actualizarForm = (campos: Partial<CrearReclamoRequest>) =>
    setForm((prev) => ({ ...prev, ...campos }));

  const siguiente = () => setPasoActivo((p) => Math.min(p + 1, 2));
  const anterior = () => setPasoActivo((p) => Math.max(p - 1, 0));

  const enviar = async () => {
    if (!form.acepta_terminos) {
      notificar.advertencia('Debes aceptar los términos y condiciones');
      return;
    }
    if (!tenantSlug) return;
    setEnviando(true);
    try {
      const resultado = await publicoApi.crearReclamo(tenantSlug, form as CrearReclamoRequest);
      // Navegar a confirmación pasando los datos del resultado
     navegar(`/libro/${tenantSlug}/confirmacion`, {
        state: {
          codigo_reclamo: resultado?.codigo_reclamo,
          fecha_registro: resultado?.fecha_registro,
          fecha_limite_respuesta: resultado?.fecha_limite_respuesta,
          mensaje: resultado?.mensaje,
        },
      });
    } catch (error) {
      manejarError(error);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return <CodeplexCargando tipo="anillo" etiqueta="Cargando formulario..." pantallaCompleta />;
  }

  if (!tenant) {
    return (
      <CodeplexContenedor anchoMaximo="sm" paginaCentrada>
        <CodeplexAlerta
          variante="peligro"
          titulo="Empresa no encontrada"
          descripcion="El enlace del libro de reclamaciones no es válido."
        />
      </CodeplexContenedor>
    );
  }

  return (
    <CodeplexContenedor anchoMaximo="md">
      <CodeplexPila direccion="columna" espaciado={3} sx={{ py: 4 }}>
        {/* Header con datos del proveedor */}
        <CodeplexCaja sx={{ textAlign: 'center' }}>
          {tenant.logo_url && (
            <img
              src={tenant.logo_url}
              alt={tenant.razon_social}
              style={{ maxHeight: 56, margin: '0 auto 8px' }}
            />
          )}
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>📋 Libro de Reclamaciones</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0' }}>
            {tenant.razon_social} — RUC: {tenant.ruc}
          </p>
          {tenant.direccion_legal && (
            <p style={{ color: '#9ca3af', margin: '2px 0 0', fontSize: '0.85rem' }}>
              {tenant.direccion_legal}
            </p>
          )}
          <CodeplexCaja sx={{ mt: 2 }}>
            <CodeplexBoton
              texto="¿Ya tienes un código? Consulta el estado aquí"
              variante="enlace"
              alHacerClick={() => navegar(`/libro/${tenantSlug}/seguimiento`)}
            />
          </CodeplexCaja>
        </CodeplexCaja>

        {/* Stepper con Color de Marca */}
        <CodeplexPasos 
          pasos={PASOS} 
          pasoActivo={pasoActivo} 
          orientacion="horizontal" 
          // CORRECCIÓN AQUÍ:
          color={tenant.color_primario ?? undefined} 
        />

        {/* Pasos del formulario con Branding */}
        {pasoActivo === 0 && (
          <PasoConsumidor
            form={form}
            sedes={sedes}
            actualizar={actualizarForm}
            alSiguiente={siguiente}
            // CORRECCIÓN AQUÍ:
            colorPrimario={tenant.color_primario ?? undefined}
          />
        )}
        {pasoActivo === 1 && (
          <PasoBien
            form={form}
            actualizar={actualizarForm}
            alSiguiente={siguiente}
            alAnterior={anterior}
            // CORRECCIÓN AQUÍ:
            colorPrimario={tenant.color_primario ?? undefined}
          />
        )}
        {pasoActivo === 2 && (
          <PasoDetalle
            form={form}
            actualizar={actualizarForm}
            alAnterior={anterior}
            alEnviar={enviar}
            enviando={enviando}
            // CORRECCIÓN AQUÍ:
            colorPrimario={tenant.color_primario ?? undefined}
          />
        )}
      </CodeplexPila>
    </CodeplexContenedor>
  );
}
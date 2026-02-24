import { useEffect, useRef, useState } from 'react';
import { CodeplexCampoTexto, CodeplexSelector, CodeplexCasilla, CodeplexBoton, CodeplexTarjeta } from '@codeplex-sac/ui';
import { CodeplexPila, CodeplexCuadricula, CodeplexCaja } from '@codeplex-sac/layout';
import { lazy, Suspense } from 'react';
import type { CrearReclamoRequest, Sede } from '@/tipos';

const MapaUbicacion = lazy(() => import('@/aplicacion/componentes/MapaUbicacion'));
import { notificar } from '@/aplicacion/helpers/toast';
import type { SelectChangeEvent } from '@mui/material/Select';

// Importamos la librería y estilos
import 'intl-tel-input/build/css/intlTelInput.css';
import intlTelInput from 'intl-tel-input';

interface Props {
  form: Partial<CrearReclamoRequest>;
  sedes: Sede[];
  actualizar: (campos: Partial<CrearReclamoRequest>) => void;
  alSiguiente: () => void;
  colorPrimario?: string | null; // <--- Nuevo campo
}

const TIPOS_DOCUMENTO = [
  { valor: 'DNI', etiqueta: 'DNI' },
  { valor: 'CE', etiqueta: 'Carné de Extranjería' },
  { valor: 'PASAPORTE', etiqueta: 'Pasaporte' },
  { valor: 'RUC', etiqueta: 'RUC' },
];

const TIPOS_SOLICITUD = [
  { valor: 'RECLAMO', etiqueta: 'Reclamo' },
  { valor: 'QUEJA', etiqueta: 'Queja' },
];

// Reglas extendidas para validación live y bloqueo de input
const REGLAS_DOCUMENTO: Record<string, { regex: RegExp; error: string; max: number; soloNumeros: boolean }> = {
  DNI: { regex: /^\d{8}$/, error: 'El DNI debe tener 8 dígitos', max: 8, soloNumeros: true },
  RUC: { regex: /^\d{11}$/, error: 'El RUC debe tener 11 dígitos', max: 11, soloNumeros: true },
  CE: { regex: /^[a-zA-Z0-9]{9,12}$/, error: 'El CE debe tener entre 9 y 12 caracteres', max: 12, soloNumeros: false },
  PASAPORTE: { regex: /^[a-zA-Z0-9]{6,12}$/, error: 'El Pasaporte debe tener entre 6 y 12 caracteres', max: 12, soloNumeros: false },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Componente pequeño para mostrar errores (para no invadir props desconocidos)
const ErrorTexto = ({ mensaje }: { mensaje?: string }) => {
  if (!mensaje) return null;
  return <span style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{mensaje}</span>;
};

export function PasoConsumidor({ form, sedes, actualizar, alSiguiente, colorPrimario }: Props) {
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const itiRef = useRef<any>(null);
  
  // Estado local para errores de validación live
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Inicializar intl-tel-input (Lógica original intacta)
  useEffect(() => {
    if (phoneInputRef.current && !itiRef.current) {
      const options: any = {
        initialCountry: "auto",
        geoIpLookup: (success: any, failure: any) => {
          fetch("https://ipapi.co/json/")
            .then((res) => res.json())
            .then((data) => success(data.country_code))
            .catch(() => success("pe"));
        },
        countryOrder: ["pe", "co", "ec", "cl", "mx", "us"],
        separateDialCode: true,
        autoPlaceholder: "polite",
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@26.1.1/build/js/utils.js",
      };

      itiRef.current = intlTelInput(phoneInputRef.current, options);

      if (form.telefono) {
          itiRef.current.setNumber(form.telefono);
      }

      const handleChange = () => {
        if (itiRef.current) {
           const numero = itiRef.current.getNumber();
           const isValid = itiRef.current.isValidNumber();
           
           // Validación live del teléfono
           if (!isValid && numero.length > 5) {
             setErrores(prev => ({ ...prev, telefono: 'Número de teléfono inválido' }));
           } else {
             setErrores(prev => { const newErr = { ...prev }; delete newErr.telefono; return newErr; });
           }
           
           actualizar({ telefono: numero });
        }
      };

      phoneInputRef.current.addEventListener('countrychange', handleChange);
      phoneInputRef.current.addEventListener('input', handleChange);
      phoneInputRef.current.addEventListener('blur', handleChange);
    }

    return () => {
      if (itiRef.current) {
        itiRef.current.destroy();
        itiRef.current = null;
      }
    };
  }, []);

  // --- MANEJADORES DE INPUT CON VALIDACIÓN LIVE ---

  const handleDocumentoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const tipo = form.tipo_documento;
      let valor = e.target.value;
      const regla = tipo ? REGLAS_DOCUMENTO[tipo] : null;

      if (regla) {
        // 1. Bloqueo de caracteres no permitidos
        if (regla.soloNumeros) {
            valor = valor.replace(/[^0-9]/g, '');
        } else {
            valor = valor.replace(/[^a-zA-Z0-9]/g, '');
        }

        // 2. Bloqueo de longitud máxima
        if (valor.length > regla.max) {
            return; // No actualizamos si excede
        }

        // 3. Validación de error live
        let errorMsg = '';
        if (valor.length > 0 && !regla.regex.test(valor) && valor.length !== regla.max) {
             // Mostramos error si está incompleto (pero escribiendo)
             errorMsg = `Debe tener ${regla.max} caracteres`;
             // Para rangos (CE/Pasaporte)
             if (!regla.soloNumeros) errorMsg = regla.error;
        } else if (valor.length > 0 && !regla.regex.test(valor)) {
             errorMsg = regla.error;
        }

        setErrores(prev => ({ ...prev, numero_documento: errorMsg }));
      }
      
      actualizar({ numero_documento: valor });
  };

  const handleTextoGeneral = (campo: keyof CrearReclamoRequest, valor: string, maxLen: number, regex?: RegExp, errorMsg?: string) => {
      // Bloqueo de longitud
      if (valor.length > maxLen) return;

      // Validación Live
      let error = '';
      if (valor.length > 0) {
          if (regex && !regex.test(valor)) {
              error = errorMsg || 'Formato inválido';
          }
      }
      
      // Validación específica para Nombre (solo letras)
      if (campo === 'nombre_completo' || campo === 'nombre_apoderado') {
         if (/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/.test(valor)) {
             // Si intenta escribir caracteres raros, los limpiamos o mostramos error.
             // Aquí opto por limpiar para mejor UX:
             valor = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
         }
      }

      setErrores(prev => {
          const nuevos = { ...prev };
          if (error) nuevos[campo] = error;
          else delete nuevos[campo];
          return nuevos;
      });

      actualizar({ [campo]: valor });
  };

  const validarFinal = (): boolean => {
    let esValido = true;
    const nuevosErrores: Record<string, string> = {};

    // 1. Validar Nombre
    if (!form.nombre_completo?.trim()) { 
        nuevosErrores.nombre_completo = 'El nombre es obligatorio';
        esValido = false; 
    }

    // 2. Validar Documento
    if (!form.tipo_documento) {
        nuevosErrores.tipo_documento = 'Seleccione tipo';
        esValido = false;
    }
    if (!form.numero_documento?.trim()) { 
        nuevosErrores.numero_documento = 'Documento obligatorio';
        esValido = false; 
    } else {
        const regla = REGLAS_DOCUMENTO[form.tipo_documento!];
        if (regla && !regla.regex.test(form.numero_documento)) {
            nuevosErrores.numero_documento = regla.error;
            esValido = false;
        }
    }

    // 3. Validar Teléfono (Lógica permisiva del original)
    if (itiRef.current) {
        const esValidoEstricto = itiRef.current.isValidNumber();
        const valorVisual = phoneInputRef.current?.value || '';
        const cantidadDigitos = valorVisual.replace(/[^0-9]/g, '').length;
        
        if (!esValidoEstricto && cantidadDigitos < 7) {
             nuevosErrores.telefono = 'Número incompleto o inválido';
             esValido = false;
        }
    }

    // 4. Validar Email
    if (!form.email?.trim()) { 
        nuevosErrores.email = 'El correo es obligatorio'; 
        esValido = false; 
    } else if (!EMAIL_REGEX.test(form.email)) { 
        nuevosErrores.email = 'Correo inválido'; 
        esValido = false; 
    }

    // 5. Validar Apoderado
    if (form.menor_de_edad && !form.nombre_apoderado?.trim()) {
        nuevosErrores.nombre_apoderado = 'Nombre del apoderado obligatorio';
        esValido = false;
    }

    setErrores(nuevosErrores);
    
    if (!esValido) {
        notificar.advertencia('Por favor corrija los errores marcados');
    }
    
    return esValido;
  };

  const opcionesSedes = (sedes || []).map((s) => ({ valor: s.slug, etiqueta: s.nombre }));

  const handleSelect = (campo: string) => (e: SelectChangeEvent<unknown>) => {
    actualizar({ [campo]: (e.target as HTMLInputElement).value });
    // Limpiar error al seleccionar
    setErrores(prev => { const n = { ...prev }; delete n[campo]; return n; });
  };

  return (
    <CodeplexTarjeta titulo="Datos del Consumidor">
      <CodeplexPila direccion="columna" espaciado={2}>
        <CodeplexCuadricula contenedor espaciado={2}>
          
          <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
            <CodeplexSelector
              etiqueta="Tipo de Solicitud *"
              opciones={TIPOS_SOLICITUD}
              value={form.tipo_solicitud ?? 'RECLAMO'}
              onChange={handleSelect('tipo_solicitud')}
            />
          </CodeplexCuadricula>
          
          {opcionesSedes.length > 0 && (
            <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
              <CodeplexSelector
                etiqueta="Sede"
                opciones={opcionesSedes}
                value={form.sede_slug ?? ''}
                onChange={handleSelect('sede_slug')}
                buscable
              />
            </CodeplexCuadricula>
          )}

          {/* Mapa de la sede seleccionada */}
          {(() => {
            const sede = sedes.find((s) => s.slug === form.sede_slug);
            if (!sede?.latitud || !sede?.longitud) return null;
            return (
              <CodeplexCuadricula elemento tamano={{ xs: 12 }}>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 6, fontWeight: 500 }}>
                  📍 Ubicación de {sede.nombre}
                </p>
                <Suspense fallback={<div style={{ height: 180, background: '#f3f4f6', borderRadius: 8 }} />}>
                  <MapaUbicacion
                    latitud={sede.latitud}
                    longitud={sede.longitud}
                    editable={false}
                    altura={180}
                    nombreSede={sede.nombre}
                  />
                </Suspense>
              </CodeplexCuadricula>
            );
          })()}

          <CodeplexCuadricula elemento tamano={{ xs: 12 }}>
            <CodeplexCampoTexto 
                etiqueta="Nombre Completo *" 
                valor={form.nombre_completo ?? ''} 
                alCambiar={(e) => handleTextoGeneral('nombre_completo', e.target.value, 150)} 
                marcador="Nombres y Apellidos"
            />
            <ErrorTexto mensaje={errores.nombre_completo} />
            <span style={{ fontSize: '0.7rem', color: '#9ca3af', float: 'right' }}>
                {(form.nombre_completo?.length || 0)}/150
            </span>
          </CodeplexCuadricula>

          <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
            <CodeplexSelector
              etiqueta="Tipo Documento *"
              opciones={TIPOS_DOCUMENTO}
              value={form.tipo_documento ?? ''}
              onChange={(e) => {
                  handleSelect('tipo_documento')(e);
                  actualizar({ numero_documento: '' });
                  setErrores(prev => { const n = { ...prev }; delete n.numero_documento; return n; });
              }}
            />
            <ErrorTexto mensaje={errores.tipo_documento} />
          </CodeplexCuadricula>

          <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
            <CodeplexCampoTexto 
                etiqueta="Número Documento *" 
                valor={form.numero_documento ?? ''} 
                alCambiar={handleDocumentoInput}
                deshabilitado={!form.tipo_documento}
                marcador={!form.tipo_documento ? 'Seleccione tipo primero' : ''}
            />
            <ErrorTexto mensaje={errores.numero_documento} />
          </CodeplexCuadricula>

          <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
             <CodeplexCaja sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>Teléfono *</label>
                <input 
                    ref={phoneInputRef}
                    type="tel"
                    className="iti-mobile-input"
                    style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${errores.telefono ? '#dc2626' : '#d1d5db'}`, // Borde rojo si hay error
                        fontSize: '1rem',
                        outline: 'none',
                        height: '56px'
                    }}
                    placeholder="987654321"
                />
             </CodeplexCaja>
             <ErrorTexto mensaje={errores.telefono} />
          </CodeplexCuadricula>

          <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
            <CodeplexCampoTexto 
                etiqueta="Correo Electrónico *" 
                valor={form.email ?? ''} 
                alCambiar={(e) => handleTextoGeneral('email', e.target.value, 100, EMAIL_REGEX, 'Correo inválido')} 
                tipo="email"
            />
            <ErrorTexto mensaje={errores.email} />
          </CodeplexCuadricula>

          <CodeplexCuadricula elemento tamano={{ xs: 12 }}>
            <CodeplexCampoTexto 
                etiqueta="Domicilio" 
                valor={form.domicilio ?? ''} 
                alCambiar={(e) => handleTextoGeneral('domicilio', e.target.value, 250)} 
            />
             <span style={{ fontSize: '0.7rem', color: '#9ca3af', float: 'right' }}>
                {(form.domicilio?.length || 0)}/250
            </span>
          </CodeplexCuadricula>

          <CodeplexCuadricula elemento tamano={{ xs: 12 }}>
            <CodeplexCasilla
              etiqueta="Menor de Edad"
              seleccionado={form.menor_de_edad ?? false}
              alCambiar={() => actualizar({ menor_de_edad: !form.menor_de_edad })}
            />
          </CodeplexCuadricula>

          {form.menor_de_edad && (
            <CodeplexCuadricula elemento tamano={{ xs: 12 }}>
              <CodeplexCampoTexto 
                etiqueta="Nombre del Apoderado *" 
                valor={form.nombre_apoderado ?? ''} 
                alCambiar={(e) => handleTextoGeneral('nombre_apoderado', e.target.value, 150)} 
              />
              <ErrorTexto mensaje={errores.nombre_apoderado} />
            </CodeplexCuadricula>
          )}

        </CodeplexCuadricula>

        <CodeplexPila direccion="fila" sx={{ justifyContent: 'flex-end' }}>
         <CodeplexBoton 
  texto="Siguiente" 
  variante="primario" 
  alHacerClick={() => validarFinal() && alSiguiente()}
  sx={colorPrimario ? { 
    backgroundColor: colorPrimario,
    borderColor: colorPrimario,
    '&:hover': { backgroundColor: colorPrimario, filter: 'brightness(0.9)' }
  } : undefined}
/>
        </CodeplexPila>
      </CodeplexPila>
    </CodeplexTarjeta>
  );
}
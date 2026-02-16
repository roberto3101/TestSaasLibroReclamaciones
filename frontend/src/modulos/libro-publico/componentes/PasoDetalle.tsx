import { useState, useRef, useEffect } from 'react';
import { CodeplexCampoTexto, CodeplexCasilla, CodeplexBoton, CodeplexTarjeta } from '@codeplex-sac/ui';
import { CodeplexPila, CodeplexCuadricula, CodeplexCaja } from '@codeplex-sac/layout';
import { CodeplexModal } from '@codeplex-sac/utils';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TextField } from '@mui/material';
import type { CrearReclamoRequest } from '@/tipos';
import { notificar } from '@/aplicacion/helpers/toast';
import dayjs from 'dayjs';

interface Props {
  form: Partial<CrearReclamoRequest>;
  actualizar: (campos: Partial<CrearReclamoRequest>) => void;
  alAnterior: () => void;
  alEnviar: () => void;
  enviando: boolean;
  colorPrimario?: string | null; // <--- Nuevo campo
}

// Helpers visuales locales
const ErrorTexto = ({ mensaje }: { mensaje?: string }) => {
  if (!mensaje) return null;
  return <span style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{mensaje}</span>;
};

const Contador = ({ actual, max }: { actual: number; max: number }) => (
  <span style={{ fontSize: '0.7rem', color: '#9ca3af', float: 'right', marginTop: '4px' }}>
    {actual}/{max}
  </span>
);

export function PasoDetalle({ form, actualizar, alAnterior, alEnviar, enviando, colorPrimario }: Props) {
  const [modalFirma, setModalFirma] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  // --- MANEJADORES CON VALIDACIÓN LIVE ---

  const handleTextoLimitado = (campo: keyof CrearReclamoRequest, valor: string, max: number) => {
    // 1. Bloqueo de longitud
    if (valor.length > max) return;

    actualizar({ [campo]: valor });

    // 2. Limpiar error si escribe algo y el campo tenía error
    if (errores[campo]) {
        // Solo limpiamos si hay contenido, o si la validación era "obligatorio" y ya no está vacío.
        // Si tienes validaciones más complejas, aquí irían.
        if (valor.trim().length > 0) {
            setErrores(prev => { const n = { ...prev }; delete n[campo]; return n; });
        }
    }
  };

  const handleFecha = (fecha: dayjs.Dayjs | null) => {
    const valor = fecha?.format('YYYY-MM-DD') ?? '';
    actualizar({ fecha_incidente: valor });
    
    if (valor && errores.fecha_incidente) {
        setErrores(prev => { const n = { ...prev }; delete n.fecha_incidente; return n; });
    }
  };

  const handleTerminos = () => {
     actualizar({ acepta_terminos: !form.acepta_terminos });
     if (!form.acepta_terminos && errores.acepta_terminos) {
         setErrores(prev => { const n = { ...prev }; delete n.acepta_terminos; return n; });
     }
  };

  // --- VALIDACIÓN FINAL ---
  const validar = (): boolean => {
    const nuevosErrores: Record<string, string> = {};
    let esValido = true;

    if (!form.fecha_incidente) { 
        nuevosErrores.fecha_incidente = 'La fecha es obligatoria'; 
        esValido = false; 
    }
    
    // Validaciones Detalle (Obligatorio)
    if (!form.detalle_reclamo?.trim()) { 
        nuevosErrores.detalle_reclamo = 'El detalle es obligatorio'; 
        esValido = false; 
    }

    // Validaciones Pedido (Obligatorio)
    if (!form.pedido_consumidor?.trim()) { 
        nuevosErrores.pedido_consumidor = 'El pedido es obligatorio'; 
        esValido = false; 
    }

    // Validaciones Área Queja (Opcional pero con límite, aquí solo validamos si por alguna razón viniera sucio, pero el input ya bloquea)
    // Si quisieras que sea obligatorio, descomenta:
    // if (!form.area_queja?.trim()) { nuevosErrores.area_queja = 'Campo requerido'; esValido = false; }

    // Validaciones Descripción Situación (Opcional pero con límite)
    
    if (!form.acepta_terminos) { 
        nuevosErrores.acepta_terminos = 'Debe aceptar los términos'; 
        esValido = false; 
    }
    
    if (!form.firma_digital) { 
        nuevosErrores.firma_digital = 'La firma es obligatoria'; 
        esValido = false; 
    }
    
    setErrores(nuevosErrores);

    if (!esValido) {
        notificar.advertencia('Complete los campos obligatorios marcados en rojo');
    }
    
    return esValido;
  };

  return (
    <>
      <CodeplexTarjeta titulo="Detalle del Reclamo">
        <CodeplexPila direccion="columna" espaciado={2}>
          <CodeplexCuadricula contenedor espaciado={2}>
            
            <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
              <DatePicker
                label="Fecha del Incidente *"
                value={form.fecha_incidente ? dayjs(form.fecha_incidente) : null}
                disableFuture
                onChange={handleFecha}
                enableAccessibleFieldDOMStructure={false}
                slots={{ textField: TextField }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined',
                    error: !!errores.fecha_incidente, // Borde rojo
                    helperText: errores.fecha_incidente // Texto error
                  },
                }}
              />
            </CodeplexCuadricula>
            
            <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
              <CodeplexCampoTexto
                etiqueta="Área de Queja"
                valor={form.area_queja ?? ''}
                alCambiar={(e) => handleTextoLimitado('area_queja', e.target.value, 200)}
                error={!!errores.area_queja} // Borde rojo
                // mensajeError={errores.area_queja} // Si tu componente soporta esto
              />
              <CodeplexCaja>
                 <ErrorTexto mensaje={errores.area_queja} />
                 <Contador actual={form.area_queja?.length || 0} max={200} />
              </CodeplexCaja>
            </CodeplexCuadricula>
            
            <CodeplexCuadricula elemento tamano={{ xs: 12 }}>
              <CodeplexCampoTexto
                etiqueta="Descripción de la Situación"
                valor={form.descripcion_situacion ?? ''}
                alCambiar={(e) => handleTextoLimitado('descripcion_situacion', e.target.value, 1000)}
                multilinea
                error={!!errores.descripcion_situacion} // Borde rojo
              />
              <CodeplexCaja>
                 <ErrorTexto mensaje={errores.descripcion_situacion} />
                 <Contador actual={form.descripcion_situacion?.length || 0} max={1000} />
              </CodeplexCaja>
            </CodeplexCuadricula>
            
            <CodeplexCuadricula elemento tamano={{ xs: 12 }}>
              <CodeplexCampoTexto
                etiqueta="Detalle del Reclamo *"
                valor={form.detalle_reclamo ?? ''}
                alCambiar={(e) => handleTextoLimitado('detalle_reclamo', e.target.value, 3000)}
                multilinea
                marcador="Describa detalladamente su reclamo..."
                error={!!errores.detalle_reclamo} // Borde rojo
              />
              <CodeplexCaja>
                  <ErrorTexto mensaje={errores.detalle_reclamo} />
                  <Contador actual={form.detalle_reclamo?.length || 0} max={3000} />
              </CodeplexCaja>
            </CodeplexCuadricula>
            
            <CodeplexCuadricula elemento tamano={{ xs: 12 }}>
              <CodeplexCampoTexto
                etiqueta="Pedido del Consumidor *"
                valor={form.pedido_consumidor ?? ''}
                alCambiar={(e) => handleTextoLimitado('pedido_consumidor', e.target.value, 2000)}
                multilinea
                marcador="¿Qué solicita como solución?"
                error={!!errores.pedido_consumidor} // Borde rojo
              />
              <CodeplexCaja>
                  <ErrorTexto mensaje={errores.pedido_consumidor} />
                  <Contador actual={form.pedido_consumidor?.length || 0} max={2000} />
              </CodeplexCaja>
            </CodeplexCuadricula>
          </CodeplexCuadricula>

          {/* Firma digital */}
          <CodeplexPila direccion="columna" espaciado={1}>
            <span style={{ fontWeight: 600, color: errores.firma_digital ? '#dc2626' : 'inherit' }}>
                Firma Digital *
            </span>
            {form.firma_digital ? (
              <CodeplexCaja sx={{ textAlign: 'center' }}>
                <img src={form.firma_digital} alt="Firma" style={{ maxWidth: 280, border: '1px solid #e5e7eb', borderRadius: 8 }} />
                <br />
                <CodeplexBoton texto="Cambiar Firma" variante="contorno" tamano="sm" alHacerClick={() => setModalFirma(true)} />
              </CodeplexCaja>
            ) : (
              <CodeplexBoton texto="Firmar" variante="contorno" alHacerClick={() => setModalFirma(true)} />
            )}
            <ErrorTexto mensaje={errores.firma_digital} />
          </CodeplexPila>

          <CodeplexCaja>
            <CodeplexCasilla
                etiqueta="Acepto los términos y condiciones del libro de reclamaciones *"
                seleccionado={form.acepta_terminos ?? false}
                alCambiar={handleTerminos}
            />
            <ErrorTexto mensaje={errores.acepta_terminos} />
          </CodeplexCaja>

          <CodeplexCasilla
            etiqueta="Deseo recibir una copia de mi reclamo"
            seleccionado={form.acepta_copia ?? false}
            alCambiar={() => actualizar({ acepta_copia: !form.acepta_copia })}
          />

          <CodeplexPila direccion="fila" sx={{ justifyContent: 'space-between' }}>
            <CodeplexBoton texto="Anterior" variante="contorno" alHacerClick={alAnterior} />
            <CodeplexBoton
              texto="Enviar Reclamo"
              variante="primario"
              tamano="lg"
              estado={enviando ? 'cargando' : 'inactivo'}
              alHacerClick={() => validar() && alEnviar()}
              sx={colorPrimario ? { 
                backgroundColor: colorPrimario,
                borderColor: colorPrimario,
                '&:hover': { backgroundColor: colorPrimario, filter: 'brightness(0.9)' }
              } : undefined}
            />
          </CodeplexPila>
        </CodeplexPila>
      </CodeplexTarjeta>

      <ModalFirmaDigital
        abierto={modalFirma}
        alCerrar={() => setModalFirma(false)}
        alConfirmar={(dataUrl) => { 
            actualizar({ firma_digital: dataUrl }); 
            setModalFirma(false);
            // Limpiar error de firma si existe
            setErrores(prev => { const n = { ...prev }; delete n.firma_digital; return n; });
        }}
      />
    </>
  );
}

// ── Modal de Firma Digital (Lógica original intacta) ──

interface ModalFirmaProps {
  abierto: boolean;
  alCerrar: () => void;
  alConfirmar: (dataUrl: string) => void;
}

function ModalFirmaDigital({ abierto, alCerrar, alConfirmar }: ModalFirmaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [tieneTrazos, setTieneTrazos] = useState(false);

  // Inicializar contexto al abrir
  useEffect(() => {
    if (abierto) {
      setTimeout(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#000000';
          ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar visualmente
          setTieneTrazos(false);
          isDrawing.current = false;
        }
      }, 50); // Pequeño delay para asegurar renderizado
    }
  }, [abierto]);

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e: any) => {
    isDrawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      const { x, y } = getPos(e);
      ctx.moveTo(x, y);
      setTieneTrazos(true);
    }
  };

  const move = (e: any) => {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const end = () => {
    isDrawing.current = false;
    canvasRef.current?.getContext('2d')?.beginPath();
  };

  const limpiar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setTieneTrazos(false);
      isDrawing.current = false;
    }
  };

  const confirmar = () => {
    if (!tieneTrazos) { notificar.advertencia('Dibuje su firma primero'); return; }
    const dataUrl = canvasRef.current?.toDataURL('image/png');
    if (dataUrl) alConfirmar(dataUrl);
  };

  return (
    <CodeplexModal
      open={abierto}
      onClose={alCerrar}
      title="Firma Digital"
      maxWidth="sm"
      locked
      footer={
        <CodeplexPila direccion="fila" espaciado={1}>
          <CodeplexBoton texto="Limpiar" variante="contorno" alHacerClick={limpiar} />
          <CodeplexBoton texto="Cancelar" variante="fantasma" alHacerClick={alCerrar} />
          <CodeplexBoton texto="Confirmar Firma" variante="primario" alHacerClick={confirmar} />
        </CodeplexPila>
      }
    >
      <CodeplexCaja sx={{ textAlign: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 8px' }}>
          Dibuje su firma en el recuadro
        </p>
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          style={{
            border: '2px dashed #d1d5db',
            borderRadius: 8,
            cursor: 'crosshair',
            touchAction: 'none',
            maxWidth: '100%',
            backgroundColor: '#fff',
            display: 'block',
            margin: '0 auto'
          }}
        />
      </CodeplexCaja>
    </CodeplexModal>
  );
}
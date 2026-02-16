import { useState } from 'react';
import { CodeplexCampoTexto, CodeplexSelector, CodeplexCampoNumero, CodeplexBoton, CodeplexTarjeta } from '@codeplex-sac/ui';
import { CodeplexPila, CodeplexCuadricula, CodeplexCaja } from '@codeplex-sac/layout';
import type { CrearReclamoRequest } from '@/tipos';
import { notificar } from '@/aplicacion/helpers/toast';
import type { SelectChangeEvent } from '@mui/material/Select';

interface Props {
  form: Partial<CrearReclamoRequest>;
  actualizar: (campos: Partial<CrearReclamoRequest>) => void;
  alSiguiente: () => void;
  alAnterior: () => void;
  colorPrimario?: string | null; // <--- Nuevo campo
}

const TIPOS_BIEN = [
  { valor: 'PRODUCTO', etiqueta: 'Producto' },
  { valor: 'SERVICIO', etiqueta: 'Servicio' },
];

// Helper para errores visuales
const ErrorTexto = ({ mensaje }: { mensaje?: string }) => {
  if (!mensaje) return null;
  return <span style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{mensaje}</span>;
};

// Helper para contadores
const Contador = ({ actual, max }: { actual: number; max: number }) => (
  <span style={{ fontSize: '0.7rem', color: '#9ca3af', float: 'right', marginTop: '4px' }}>
    {actual}/{max}
  </span>
);

export function PasoBien({ form, actualizar, alSiguiente, alAnterior, colorPrimario }: Props) {
  // Estado para errores en tiempo real
  const [errores, setErrores] = useState<Record<string, string>>({});

  // --- HANDLERS CON VALIDACIÓN LIVE ---

 const handleMonto = (valor: number | null) => {
    // Si valor es null (campo vacío), asumimos 0 para evitar errores
    const num = valor ?? 0;
    
    // 1. Bloqueo de negativos
    if (num < 0) return;

    // 2. Bloqueo de límite superior (para evitar overflow en BD DECIMAL)
    if (num > 9999999.99) return;

    actualizar({ monto_reclamado: num });
    
    // Limpiar error si existe
    if (errores.monto_reclamado) {
        setErrores(prev => { const n = { ...prev }; delete n.monto_reclamado; return n; });
    }
  };

  const handleDescripcion = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    const maxLen = 500;

    // 1. Bloqueo de longitud
    if (val.length > maxLen) return;

    actualizar({ descripcion_bien: val });

    // 2. Validación Live (Campo requerido)
    if (val.trim().length === 0) {
       // Si borra todo, no mostramos error rojo inmediatamente para no ser molestos, 
       // pero si ya había error, lo mantenemos o actualizamos.
    } else {
       // Si escribe algo, limpiamos el error
       if (errores.descripcion_bien) {
          setErrores(prev => { const n = { ...prev }; delete n.descripcion_bien; return n; });
       }
    }
  };

  const handlePedido = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    const maxLen = 50;

    // 1. Bloqueo de longitud
    if (val.length > maxLen) return;

    actualizar({ numero_pedido: val });
    
    // Este campo es opcional, así que solo limpiamos errores si hubiera alguna validación extra futura
    if (errores.numero_pedido) {
       setErrores(prev => { const n = { ...prev }; delete n.numero_pedido; return n; });
    }
  };

  const handleSelectTipo = (e: SelectChangeEvent<unknown>) => {
    const val = (e.target as HTMLInputElement).value;
    actualizar({ tipo_bien: val as string });
    
    // Limpiar error
    setErrores(prev => { const n = { ...prev }; delete n.tipo_bien; return n; });
  };

  // --- VALIDACIÓN FINAL (Al dar Siguiente) ---
  const validar = (): boolean => {
    const nuevosErrores: Record<string, string> = {};
    let esValido = true;

    // 1. Validar Tipo de Bien
    if (!form.tipo_bien) {
      nuevosErrores.tipo_bien = 'Debe seleccionar un tipo';
      esValido = false;
    }

    // 2. Validar Monto (Opcional en lógica, pero si pones 0 a veces es error de negocio. Aquí permitimos 0 si es un reclamo no monetario, pero validamos negativos por seguridad extra)
    if ((form.monto_reclamado ?? 0) < 0) {
       nuevosErrores.monto_reclamado = 'Monto inválido';
       esValido = false;
    }

    // 3. Validar Descripción del Bien
    if (!form.descripcion_bien?.trim()) {
      nuevosErrores.descripcion_bien = 'La descripción es obligatoria';
      esValido = false;
    }

    setErrores(nuevosErrores);

    if (!esValido) {
        notificar.advertencia('Complete los campos obligatorios');
    }

    return esValido;
  };

  return (
    <CodeplexTarjeta titulo="Bien Contratado">
      <CodeplexPila direccion="columna" espaciado={2}>
        <CodeplexCuadricula contenedor espaciado={2}>
          
          <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
            <CodeplexSelector
              etiqueta="Tipo de Bien *"
              opciones={TIPOS_BIEN}
              value={form.tipo_bien ?? ''}
              onChange={handleSelectTipo}
            />
            <ErrorTexto mensaje={errores.tipo_bien} />
          </CodeplexCuadricula>
          
          <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
            <CodeplexCampoNumero
              etiqueta="Monto Reclamado (S/)"
              valor={form.monto_reclamado ?? 0}
              minimo={0}
              alCambiar={handleMonto}
            />
            <ErrorTexto mensaje={errores.monto_reclamado} />
          </CodeplexCuadricula>
          
          <CodeplexCuadricula elemento tamano={{ xs: 12 }}>
            <CodeplexCampoTexto
              etiqueta="Descripción del Bien/Servicio *"
              valor={form.descripcion_bien ?? ''}
              alCambiar={handleDescripcion}
              multilinea
            />
            <CodeplexCaja>
                <ErrorTexto mensaje={errores.descripcion_bien} />
                <Contador actual={form.descripcion_bien?.length || 0} max={500} />
            </CodeplexCaja>
          </CodeplexCuadricula>
          
          <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
            <CodeplexCampoTexto
              etiqueta="Número de Pedido (Opcional)"
              valor={form.numero_pedido ?? ''}
              alCambiar={handlePedido}
            />
            <CodeplexCaja>
                <Contador actual={form.numero_pedido?.length || 0} max={50} />
            </CodeplexCaja>
          </CodeplexCuadricula>

        </CodeplexCuadricula>

        <CodeplexPila direccion="fila" sx={{ justifyContent: 'space-between' }}>
          <CodeplexBoton texto="Anterior" variante="contorno" alHacerClick={alAnterior} />
          <CodeplexBoton 
  texto="Siguiente" 
  variante="primario" 
  alHacerClick={() => validar() && alSiguiente()} 
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
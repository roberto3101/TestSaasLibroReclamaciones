import { useState } from 'react';
import { CodeplexModal } from '@codeplex-sac/utils';
import { 
  CodeplexCampoTexto, 
  CodeplexSelector, 
  CodeplexBoton, 
  CodeplexAlerta 
} from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import type { EntornoAPIKey } from '@/tipos/chatbot';
import { chatbotsApi } from '../api/chatbots.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import type { SelectChangeEvent } from '@mui/material/Select';

interface Props {
  abierto: boolean;
  chatbotId: string;
  alCerrar: () => void;
  alCrear: () => void;
}

// Estos valores deben coincidir con el tipo EntornoAPIKey ('LIVE' | 'TEST')
const ENTORNOS: { valor: EntornoAPIKey; etiqueta: string }[] = [
  { valor: 'TEST', etiqueta: 'Test / Desarrollo' },
  { valor: 'LIVE', etiqueta: 'Live / Producción' },
];

export function FormAPIKey({ abierto, chatbotId, alCerrar, alCrear }: Props) {
  const [nombre, setNombre] = useState('');
  // Valor por defecto seguro y tipado
  const [entorno, setEntorno] = useState<EntornoAPIKey>('TEST');
  
  const [keyGenerada, setKeyGenerada] = useState('');
  const [cargando, setCargando] = useState(false);

  const generar = async () => {
    if (!nombre.trim()) { 
      notificar.advertencia('El nombre es obligatorio'); 
      return; 
    }
    
    setCargando(true);
    try {
      const resultado = await chatbotsApi.generarKey(chatbotId, { nombre, entorno });
      setKeyGenerada(resultado.plain_key);
      notificar.exito('API Key generada — cópiala ahora, no se mostrará de nuevo');
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  };

  const cerrar = () => {
    setNombre('');
    setKeyGenerada('');
    setEntorno('TEST'); // Reset al valor por defecto
    if (keyGenerada) alCrear(); // Si generó algo, recargar lista al cerrar
    else alCerrar();
  };

  return (
    <CodeplexModal 
      open={abierto} 
      onClose={cerrar} 
      title="Generar API Key" 
      maxWidth="sm"
      footer={
        keyGenerada ? (
          <CodeplexBoton texto="Cerrar" variante="primario" alHacerClick={cerrar} />
        ) : (
          <CodeplexPila direccion="fila" espaciado={1} sx={{ justifyContent: 'flex-end' }}>
            <CodeplexBoton texto="Cancelar" variante="contorno" alHacerClick={cerrar} />
            <CodeplexBoton 
              texto="Generar" 
              variante="primario" 
              estado={cargando ? 'cargando' : 'inactivo'} 
              alHacerClick={generar} 
            />
          </CodeplexPila>
        )
      }
    >
      {keyGenerada ? (
        <CodeplexPila direccion="columna" espaciado={2}>
          <CodeplexAlerta 
            variante="advertencia" 
            titulo="¡Importante!" 
            descripcion="Copia esta key ahora. Por seguridad, no se volverá a mostrar." 
          />
          <CodeplexCampoTexto 
            etiqueta="API Key (Token)" 
            valor={keyGenerada} 
            // InputProps={{ readOnly: true }} // Opcional si el componente lo soporta
            textoAyuda="Úsala en el header X-API-Key"
          />
        </CodeplexPila>
      ) : (
        <CodeplexPila direccion="columna" espaciado={2}>
          <CodeplexCampoTexto 
            etiqueta="Nombre *" 
            valor={nombre} 
            alCambiar={(e) => setNombre(e.target.value)} 
            marcador="Ej: Integración Web" 
            anchoCompleto
          />
          <CodeplexSelector
            etiqueta="Entorno *"
            opciones={ENTORNOS}
            value={entorno}
            alCambiar={(e: SelectChangeEvent<unknown>) => setEntorno(e.target.value as EntornoAPIKey)}
          />
        </CodeplexPila>
      )}
    </CodeplexModal>
  );
}
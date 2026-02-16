import { useEffect } from 'react';
import { usarEstadoAuth } from '@/aplicacion/estado/estadoAuth';
import Enrutador from '@/aplicacion/Enrutador';

export default function App() {
  const inicializar = usarEstadoAuth((s) => s.inicializar);

  useEffect(() => {
    inicializar();
  }, [inicializar]);

  return <Enrutador />;
}
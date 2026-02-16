import { useNavigate } from 'react-router-dom';
import { CodeplexCaja, CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexBoton } from '@codeplex-sac/ui';

export default function Pagina404() {
  const navegar = useNavigate();

  return (
    <CodeplexCaja centrado sx={{ minHeight: '100vh' }}>
      <CodeplexPila direccion="columna" espaciado={2} sx={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '6rem', margin: 0, fontWeight: 700, color: '#3b82f6' }}>404</h1>
        <h2 style={{ margin: 0 }}>Página no encontrada</h2>
        <p style={{ color: '#6b7280' }}>La página que buscas no existe o fue movida.</p>
        <CodeplexBoton texto="Volver al Inicio" variante="primario" alHacerClick={() => navegar('/dashboard')} />
      </CodeplexPila>
    </CodeplexCaja>
  );
}

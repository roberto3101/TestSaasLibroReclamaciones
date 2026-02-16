import { Outlet } from 'react-router-dom';
import { CodeplexCaja } from '@codeplex-sac/layout';

export default function LayoutPublico() {
  return (
    <CodeplexCaja
      centrado
      sx={{ minHeight: '100vh', bgcolor: 'background.default' }}
    >
      <Outlet />
    </CodeplexCaja>
  );
}

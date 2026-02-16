import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CodeplexProveedorTema, CodeplexProveedorMui } from '@codeplex-sac/theme';
import { CodeplexProveedorFechas } from '@codeplex-sac/date-pickers';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CodeplexProveedorTema temaPorDefecto="light">
      <CodeplexProveedorMui>
        <CodeplexProveedorFechas idioma="es">
          <BrowserRouter>
            <App />
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          </BrowserRouter>
        </CodeplexProveedorFechas>
      </CodeplexProveedorMui>
    </CodeplexProveedorTema>
  </StrictMode>,
);

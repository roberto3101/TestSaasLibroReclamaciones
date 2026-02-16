import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CodeplexCampoTexto, CodeplexBoton } from '@codeplex-sac/ui';
import { CodeplexCaja, CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexIconoCorreo, CodeplexIconoCandado } from '@codeplex-sac/icons';
import { usarAuth } from '@/aplicacion/ganchos/usarAuth';
import { usarEstadoAuth } from '@/aplicacion/estado/estadoAuth';

export default function PaginaLogin() {
  const { autenticado } = usarEstadoAuth();
  const { iniciarSesion } = usarAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState({ email: '', password: '' });

  if (autenticado) return <Navigate to="/dashboard" replace />;

  const validar = (): boolean => {
    const nuevosErrores = { email: '', password: '' };
    if (!email.trim()) nuevosErrores.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nuevosErrores.email = 'Correo inválido';
    if (!password) nuevosErrores.password = 'La contraseña es obligatoria';
    setErrores(nuevosErrores);
    return !nuevosErrores.email && !nuevosErrores.password;
  };

 const manejarSubmit = async () => {
    console.log('>>> CLICK DETECTADO', { email, password });
    if (!validar()) {
      console.log('>>> VALIDACION FALLO');
      return;
    }
    console.log('>>> ENVIANDO LOGIN...');
    setCargando(true);
    try {
      await iniciarSesion(email, password);
      console.log('>>> LOGIN OK');
    } catch (err) {
      console.log('>>> LOGIN ERROR', err);
    } finally {
      setCargando(false);
    }
  };
  const manejarTecla = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') manejarSubmit();
  };

  return (
    <CodeplexCaja
      centrado
      sx={{ minHeight: '100vh', width: '100%', bgcolor: 'background.default' }}
    >
      <CodeplexCaja
        variante="sombreado"
        relleno={5}
        sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }}
      >
        <CodeplexPila direccion="columna" espaciado={3}>
          <CodeplexPila direccion="columna" espaciado={1} sx={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600 }}>
              📋 Libro de Reclamaciones
            </h1>
            <p style={{ margin: 0, color: '#6b7280' }}>Ingresa a tu panel de administración</p>
          </CodeplexPila>

          <CodeplexCampoTexto
            etiqueta="Correo Electrónico"
            valor={email}
            alCambiar={(e) => setEmail(e.target.value)}
            iconoInicio={<CodeplexIconoCorreo />}
            marcador="admin@empresa.com"
            mensajeError={errores.email}
            onKeyDown={manejarTecla}
          />

          <CodeplexCampoTexto
            etiqueta="Contraseña"
            valor={password}
            alCambiar={(e) => setPassword(e.target.value)}
            tipo="password"
            iconoInicio={<CodeplexIconoCandado />}
            marcador="••••••••"
            mensajeError={errores.password}
            onKeyDown={manejarTecla}
          />

          <CodeplexBoton
            texto="Iniciar Sesión"
            variante="primario"
            tamano="lg"
            estado={cargando ? 'cargando' : 'inactivo'}
            alHacerClick={manejarSubmit}
            sx={{ width: '100%' }}
          />
        </CodeplexPila>
      </CodeplexCaja>
    </CodeplexCaja>
  );
}

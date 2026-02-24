import { useState, useEffect } from 'react';
import { CodeplexModal } from '@codeplex-sac/utils';
import { CodeplexCampoTexto, CodeplexSelector, CodeplexBoton } from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import { Typography, Divider } from '@mui/material';
import type { RolUsuario, Usuario, Sede } from '@/tipos';
import { usuariosApi } from '../api/usuarios.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import type { SelectChangeEvent } from '@mui/material/Select';

interface Props {
  abierto: boolean;
  usuario?: Usuario | null;
  sedes: Sede[];
  alCerrar: () => void;
  alGuardar: () => void;
}

const OPCIONES_ROL = [
  { valor: 'ADMIN', etiqueta: '🛡️ Administrador — Acceso total' },
  { valor: 'SOPORTE', etiqueta: '🎧 Soporte — Gestión de reclamos' },
];

export function FormUsuario({ abierto, usuario, sedes, alCerrar, alGuardar }: Props) {
  const esEdicion = !!usuario;

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<RolUsuario>('SOPORTE');
  const [sedeId, setSedeId] = useState<string>('');
  const [cargando, setCargando] = useState(false);

  const opcionesSede = [
    { valor: '', etiqueta: '🌐 Todas las sedes (global)' },
    ...sedes.map((s) => ({ valor: s.id, etiqueta: `📍 ${s.nombre}` })),
  ];

  useEffect(() => {
    if (usuario) {
      setNombre(usuario.nombre_completo);
      setEmail(usuario.email);
      setRol(usuario.rol as RolUsuario);
      const sid = usuario.sede_id;
      setSedeId(typeof sid === 'object' && sid !== null ? (sid as any).UUID || '' : sid || '');
      setPassword('');
    } else {
      setNombre('');
      setEmail('');
      setPassword('');
      setRol('SOPORTE');
      setSedeId('');
    }
  }, [usuario, abierto]);

  // Si es ADMIN, forzar sede global
  useEffect(() => {
    if (rol === 'ADMIN') setSedeId('');
  }, [rol]);

  const manejarGuardar = async () => {
    if (!nombre.trim() || !email.trim()) {
      notificar.advertencia('Nombre y email son obligatorios');
      return;
    }
    if (!esEdicion && !password) {
      notificar.advertencia('La contraseña es obligatoria para nuevos usuarios');
      return;
    }

    setCargando(true);
    try {
      const sedeUuid = sedeId || undefined;

      if (esEdicion && usuario) {
        await usuariosApi.actualizar(usuario.id, {
          nombre_completo: nombre,
          rol,
          sede_id: sedeUuid as any,
          activo: true,
        });
        if (password.trim()) {
          await usuariosApi.cambiarPassword(usuario.id, password);
        }
        notificar.exito('Usuario actualizado');
      } else {
        await usuariosApi.crear({
          email,
          nombre_completo: nombre,
          password,
          rol,
          sede_id: sedeUuid as any,
        });
        notificar.exito('Usuario creado exitosamente');
      }
      alGuardar();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <CodeplexModal
      open={abierto}
      onClose={alCerrar}
      title={esEdicion ? '✏️ Editar Usuario' : '👤 Nuevo Usuario'}
      maxWidth="sm"
      footer={
        <CodeplexPila direccion="fila" espaciado={1}>
          <CodeplexBoton texto="Cancelar" variante="contorno" alHacerClick={alCerrar} />
          <CodeplexBoton
            texto={esEdicion ? 'Guardar Cambios' : 'Crear Usuario'}
            variante="primario"
            estado={cargando ? 'cargando' : 'inactivo'}
            alHacerClick={manejarGuardar}
          />
        </CodeplexPila>
      }
    >
      <CodeplexPila direccion="columna" espaciado={2}>
        <CodeplexCampoTexto etiqueta="Nombre Completo" valor={nombre} alCambiar={(e) => setNombre(e.target.value)} />
        <CodeplexCampoTexto
          etiqueta="Correo Electrónico"
          valor={email}
          alCambiar={(e) => setEmail(e.target.value)}
          deshabilitado={esEdicion}
        />
        <CodeplexCampoTexto
          etiqueta={esEdicion ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
          valor={password}
          alCambiar={(e) => setPassword(e.target.value)}
          tipo="password"
        />

        <Divider sx={{ my: 0.5 }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Permisos y asignación
        </Typography>

        <CodeplexSelector
          etiqueta="Rol"
          opciones={OPCIONES_ROL}
          value={rol}
          onChange={(e: SelectChangeEvent<unknown>) => setRol((e.target as HTMLInputElement).value as RolUsuario)}
        />

        {rol === 'SOPORTE' && (
          <CodeplexSelector
            etiqueta="Sede asignada"
            opciones={opcionesSede}
            value={sedeId}
            onChange={(e: SelectChangeEvent<unknown>) => setSedeId((e.target as HTMLInputElement).value as string)}
          />
        )}

        {rol === 'ADMIN' && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', mt: -1 }}>
            Los administradores tienen acceso a todas las sedes automáticamente.
          </Typography>
        )}
      </CodeplexPila>
    </CodeplexModal>
  );
}
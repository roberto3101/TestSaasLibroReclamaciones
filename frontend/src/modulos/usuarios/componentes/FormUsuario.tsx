import { useState } from 'react';
import { CodeplexModal } from '@codeplex-sac/utils';
import { CodeplexCampoTexto, CodeplexSelector, CodeplexBoton } from '@codeplex-sac/ui';
import { CodeplexPila } from '@codeplex-sac/layout';
import type { RolUsuario } from '@/tipos';
import { usuariosApi } from '../api/usuarios.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import type { SelectChangeEvent } from '@mui/material/Select';

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  alGuardar: () => void;
}

const OPCIONES_ROL = [
  { valor: 'ADMIN', etiqueta: 'Administrador' },
  { valor: 'SOPORTE', etiqueta: 'Soporte' },
  { valor: 'VISOR', etiqueta: 'Visor' },
];

export function FormUsuario({ abierto, alCerrar, alGuardar }: Props) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<RolUsuario>('SOPORTE');
  const [cargando, setCargando] = useState(false);

  const limpiar = () => {
    setNombre('');
    setEmail('');
    setPassword('');
    setRol('SOPORTE');
  };

  const manejarGuardar = async () => {
    if (!nombre.trim() || !email.trim() || !password) {
      notificar.advertencia('Todos los campos son obligatorios');
      return;
    }
    setCargando(true);
    try {
      await usuariosApi.crear({ email, nombre_completo: nombre, password, rol });
      notificar.exito('Usuario creado exitosamente');
      limpiar();
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
      title="Nuevo Usuario"
      maxWidth="sm"
      footer={
        <CodeplexPila direccion="fila" espaciado={1}>
          <CodeplexBoton texto="Cancelar" variante="contorno" alHacerClick={alCerrar} />
          <CodeplexBoton
            texto="Crear Usuario"
            variante="primario"
            estado={cargando ? 'cargando' : 'inactivo'}
            alHacerClick={manejarGuardar}
          />
        </CodeplexPila>
      }
    >
      <CodeplexPila direccion="columna" espaciado={2}>
        <CodeplexCampoTexto etiqueta="Nombre Completo" valor={nombre} alCambiar={(e) => setNombre(e.target.value)} />
        <CodeplexCampoTexto etiqueta="Correo Electrónico" valor={email} alCambiar={(e) => setEmail(e.target.value)} />
        <CodeplexCampoTexto etiqueta="Contraseña" valor={password} alCambiar={(e) => setPassword(e.target.value)} tipo="password" />
        <CodeplexSelector
          etiqueta="Rol"
          opciones={OPCIONES_ROL}
          value={rol}
          onChange={(e: SelectChangeEvent<unknown>) => setRol((e.target as HTMLInputElement).value as RolUsuario)}
        />
      </CodeplexPila>
    </CodeplexModal>
  );
}
import { useState } from 'react';
import { CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexBoton } from '@codeplex-sac/ui';
import { CodeplexIconoAñadir } from '@codeplex-sac/icons';
import { usarUsuarios } from '../ganchos/usarUsuarios';
import { usarSedes } from '@/modulos/sedes/ganchos/usarSedes';
import { TablaUsuarios } from '../componentes/TablaUsuarios';
import { FormUsuario } from '../componentes/FormUsuario';
import type { Usuario } from '@/tipos';
import { usarAuth } from '@/aplicacion/ganchos/usarAuth';

export default function PaginaUsuarios() {
  const { usuarios, cargando, recargar } = usarUsuarios();
  const { sedes } = usarSedes();
const { usuario: usuarioActual } = usarAuth();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);

  const abrirCrear = () => {
    setUsuarioEditar(null);
    setMostrarForm(true);
  };

  const abrirEditar = (usuario: Usuario) => {
    setUsuarioEditar(usuario);
    setMostrarForm(true);
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setUsuarioEditar(null);
  };

  return (
    <CodeplexPila direccion="columna" espaciado={3}>
      <CodeplexPila direccion="fila" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Gestión de Usuarios</h2>
        <CodeplexBoton
          texto="Nuevo Usuario"
          variante="primario"
          iconoIzquierda={<CodeplexIconoAñadir />}
          alHacerClick={abrirCrear}
        />
      </CodeplexPila>

      <TablaUsuarios
        usuarios={usuarios}
        sedes={sedes}
        cargando={cargando}
        alRecargar={recargar}
        alEditar={abrirEditar}
        usuarioActualId={usuarioActual?.id}
      />

      <FormUsuario
        abierto={mostrarForm}
        usuario={usuarioEditar}
        sedes={sedes}
        alCerrar={cerrarForm}
        alGuardar={() => {
          cerrarForm();
          recargar();
        }}
      />
    </CodeplexPila>
  );
}
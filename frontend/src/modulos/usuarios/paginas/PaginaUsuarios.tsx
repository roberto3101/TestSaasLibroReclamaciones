import { useState } from 'react';
import { CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexBoton } from '@codeplex-sac/ui';
import { CodeplexIconoAñadir } from '@codeplex-sac/icons';
import { usarUsuarios } from '../ganchos/usarUsuarios';
import { TablaUsuarios } from '../componentes/TablaUsuarios';
import { FormUsuario } from '../componentes/FormUsuario';

export default function PaginaUsuarios() {
  const { usuarios, cargando, recargar } = usarUsuarios();
  const [mostrarForm, setMostrarForm] = useState(false);

  return (
    <CodeplexPila direccion="columna" espaciado={3}>
      <CodeplexPila direccion="fila" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Gestión de Usuarios</h2>
        <CodeplexBoton
          texto="Nuevo Usuario"
          variante="primario"
          iconoIzquierda={<CodeplexIconoAñadir />}
          alHacerClick={() => setMostrarForm(true)}
        />
      </CodeplexPila>

      <TablaUsuarios usuarios={usuarios} cargando={cargando} alRecargar={recargar} />

      <FormUsuario
        abierto={mostrarForm}
        alCerrar={() => setMostrarForm(false)}
        alGuardar={() => {
          setMostrarForm(false);
          recargar();
        }}
      />
    </CodeplexPila>
  );
}

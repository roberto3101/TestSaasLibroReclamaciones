import { useState, useEffect, useRef } from 'react';
import { CodeplexPila, CodeplexCuadricula, CodeplexCaja } from '@codeplex-sac/layout';
import { 
  CodeplexCampoTexto, 
  CodeplexBoton, 
  CodeplexInterruptor, 
  CodeplexCargando, 
  CodeplexTarjeta
} from '@codeplex-sac/ui';
import { usarTenant } from '../ganchos/usarTenant';
import { tenantApi } from '../api/tenant.api';
import { notificar } from '@/aplicacion/helpers/toast';
import { manejarError } from '@/aplicacion/helpers/errores';
import type { ActualizarTenantRequest } from '@/tipos';

export default function PaginaConfigTenant() {
  const { tenant, cargando, recargar } = usarTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado del formulario
  const [form, setForm] = useState<ActualizarTenantRequest>({
    razon_social: '', ruc: '', nombre_comercial: '', direccion_legal: '',
    departamento: '', provincia: '', distrito: '', telefono: '', email_contacto: '',
    sitio_web: '', logo_url: '', color_primario: '#1a56db', mensaje_confirmacion: '',
    plazo_respuesta_dias: 30, notificar_whatsapp: false, notificar_email: false,
    version: 0,
  });
  
  const [guardando, setGuardando] = useState(false);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    if (tenant) {
      setForm({
        razon_social: tenant.razon_social,
        ruc: tenant.ruc,
        nombre_comercial: tenant.nombre_comercial ?? '',
        direccion_legal: tenant.direccion_legal ?? '',
        departamento: tenant.departamento ?? '',
        provincia: tenant.provincia ?? '',
        distrito: tenant.distrito ?? '',
        telefono: tenant.telefono ?? '',
        email_contacto: tenant.email_contacto ?? '',
        sitio_web: tenant.sitio_web ?? '',
        logo_url: tenant.logo_url ?? '',
        color_primario: tenant.color_primario ?? '#1a56db',
        mensaje_confirmacion: tenant.mensaje_confirmacion ?? '',
        plazo_respuesta_dias: tenant.plazo_respuesta_dias,
        notificar_whatsapp: tenant.notificar_whatsapp,
        notificar_email: tenant.notificar_email,
        version: tenant.version,
      });
      setPreviewLogo(tenant.logo_url ?? null);
    }
  }, [tenant]);

  if (cargando) return <CodeplexCargando tipo="anillo" etiqueta="Cargando configuración..." pantallaCompleta />;

  const actualizar = (campo: keyof ActualizarTenantRequest, valor: any) =>
    setForm((p) => ({ ...p, [campo]: valor }));

  // --- LÓGICA DE COMPRESIÓN DE IMAGEN ---
  const procesarImagen = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                
                // Reducimos drásticamente el tamaño para que sea un STRING ligero
                const MAX_SIZE = 200; 
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                    // Fondo blanco por si es PNG transparente (para que no salga negro en JPG)
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                }
                
                // Convertimos a JPEG calidad 0.7 -> Esto genera una cadena Base64 muy corta
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
  };

  const manejarSubidaLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      notificar.error('Solo se permiten imágenes (PNG, JPG, WEBP)');
      return;
    }

    try {
        const imagenComprimida = await procesarImagen(file);
        setPreviewLogo(imagenComprimida);
        actualizar('logo_url', imagenComprimida);
        notificar.exito('Logo procesado correctamente');
    } catch (error) {
        console.error(error);
        notificar.error('Error al procesar la imagen');
    }
  };

  const eliminarLogo = () => {
    setPreviewLogo(null);
    actualizar('logo_url', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await tenantApi.actualizar(form);
      notificar.exito('Configuración actualizada');
      await recargar(); // Recargamos para verificar que se guardó en DB
    } catch (error) {
      manejarError(error);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <CodeplexPila direccion="columna" espaciado={4} sx={{ maxWidth: '1200px', margin: '0 auto', pb: 4 }}>
      
      {/* Header */}
      <CodeplexCaja sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
            Configuración de Empresa
          </h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Gestiona la información legal, branding y preferencias operativas.
          </p>
        </div>
        <CodeplexBoton
          texto="Guardar Cambios"
          variante="primario"
          tamano="lg"
          estado={guardando ? 'cargando' : 'inactivo'}
          alHacerClick={guardar}
        />
      </CodeplexCaja>

      <CodeplexCuadricula contenedor espaciado={3}>
        
        {/* Columna Izquierda: Identidad y Ubicación */}
        <CodeplexCuadricula elemento tamano={{ xs: 12, lg: 8 }}>
          <CodeplexPila direccion="columna" espaciado={3}>
            
            {/* Sección 1: Identidad Corporativa */}
            <CodeplexTarjeta titulo="Identidad Visual">
              <CodeplexCuadricula contenedor espaciado={2}>
                
                {/* UPLOADER DE LOGO */}
                <CodeplexCuadricula elemento tamano={{ xs: 12 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                    Logo de la Empresa (Visible en el Libro)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    
                    {/* Previsualización */}
                    <div style={{ 
                      width: '100px', height: '100px', 
                      borderRadius: '12px', 
                      border: '1px solid #e5e7eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: '#f9fafb',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {previewLogo ? (
                        <img src={previewLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png, image/jpeg, image/webp"
                        onChange={manejarSubidaLogo}
                        style={{ display: 'none' }}
                      />
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#fff',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#374151',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          Subir Logo
                        </button>
                        {previewLogo && (
                          <button
                            type="button"
                            onClick={eliminarLogo}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#fff',
                              border: '1px solid #fee2e2',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              color: '#dc2626',
                              cursor: 'pointer'
                            }}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                        Se optimizará automáticamente. Formatos: PNG, JPG.
                      </p>
                    </div>
                  </div>
                </CodeplexCuadricula>

                <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
                  <CodeplexCampoTexto 
                    etiqueta="Nombre Comercial" 
                    valor={form.nombre_comercial ?? ''} 
                    alCambiar={(e) => actualizar('nombre_comercial', e.target.value)} 
                    textoAyuda="Nombre público de la marca."
                  />
                </CodeplexCuadricula>
                <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
                  <CodeplexCampoTexto 
                    etiqueta="Sitio Web" 
                    valor={form.sitio_web ?? ''} 
                    alCambiar={(e) => actualizar('sitio_web', e.target.value)} 
                    marcador="https://..."
                  />
                </CodeplexCuadricula>
              </CodeplexCuadricula>
            </CodeplexTarjeta>

            {/* Sección 2: Información Legal */}
            <CodeplexTarjeta titulo="Información Legal">
              <CodeplexCuadricula contenedor espaciado={2}>
                <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
                  <CodeplexCampoTexto 
                    etiqueta="RUC *" 
                    valor={form.ruc} 
                    alCambiar={(e) => actualizar('ruc', e.target.value)} 
                  />
                </CodeplexCuadricula>
                <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 6 }}>
                  <CodeplexCampoTexto 
                    etiqueta="Razón Social *" 
                    valor={form.razon_social} 
                    alCambiar={(e) => actualizar('razon_social', e.target.value)} 
                  />
                </CodeplexCuadricula>
                <CodeplexCuadricula elemento tamano={{ xs: 12 }}>
                  <CodeplexCampoTexto 
                    etiqueta="Dirección Legal" 
                    valor={form.direccion_legal ?? ''} 
                    alCambiar={(e) => actualizar('direccion_legal', e.target.value)} 
                  />
                </CodeplexCuadricula>
                <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 4 }}>
                  <CodeplexCampoTexto etiqueta="Departamento" valor={form.departamento ?? ''} alCambiar={(e) => actualizar('departamento', e.target.value)} />
                </CodeplexCuadricula>
                <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 4 }}>
                  <CodeplexCampoTexto etiqueta="Provincia" valor={form.provincia ?? ''} alCambiar={(e) => actualizar('provincia', e.target.value)} />
                </CodeplexCuadricula>
                <CodeplexCuadricula elemento tamano={{ xs: 12, sm: 4 }}>
                  <CodeplexCampoTexto etiqueta="Distrito" valor={form.distrito ?? ''} alCambiar={(e) => actualizar('distrito', e.target.value)} />
                </CodeplexCuadricula>
              </CodeplexCuadricula>
            </CodeplexTarjeta>

          </CodeplexPila>
        </CodeplexCuadricula>

        {/* Columna Derecha: Configuración y Preferencias */}
        <CodeplexCuadricula elemento tamano={{ xs: 12, lg: 4 }}>
          <CodeplexPila direccion="columna" espaciado={3}>

            {/* Sección 3: Personalización */}
            <CodeplexTarjeta titulo="Personalización">
               <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                 Color de Marca
               </label>
               <div style={{ 
                 display: 'flex', alignItems: 'center', gap: '12px', 
                 padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' 
               }}>
                  <input
                    type="color"
                    value={form.color_primario || '#1a56db'}
                    onChange={(e) => actualizar('color_primario', e.target.value)}
                    style={{ 
                      width: '40px', height: '40px', 
                      padding: 0, border: 'none', 
                      borderRadius: '8px', cursor: 'pointer',
                      backgroundColor: 'transparent'
                    }}
                    title="Clic para elegir color"
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                      {form.color_primario || '#1a56db'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                      Color de botones y títulos.
                    </p>
                  </div>
               </div>
            </CodeplexTarjeta>

            {/* Sección 4: Reglas */}
            <CodeplexTarjeta titulo="Reglas de Negocio">
              <CodeplexPila direccion="columna" espaciado={2}>
                 <CodeplexCampoTexto
                    etiqueta="Plazo de Respuesta (días)"
                    valor={String(form.plazo_respuesta_dias)}
                    alCambiar={(e) => actualizar('plazo_respuesta_dias', Number(e.target.value))}
                    tipo="number"
                 />
                 <CodeplexCampoTexto
                  etiqueta="Mensaje Final al Cliente"
                  valor={form.mensaje_confirmacion ?? ''}
                  alCambiar={(e) => actualizar('mensaje_confirmacion', e.target.value)}
                  multilinea
                  filas={3}
                  textoAyuda="Ej: Gracias. Le responderemos pronto."
                />
              </CodeplexPila>
            </CodeplexTarjeta>

            {/* Sección 5: Contacto y Alertas */}
            <CodeplexTarjeta titulo="Contacto y Alertas">
              <CodeplexPila direccion="columna" espaciado={2}>
                 <CodeplexCampoTexto 
                    etiqueta="Email de Contacto" 
                    valor={form.email_contacto ?? ''} 
                    alCambiar={(e) => actualizar('email_contacto', e.target.value)} 
                    tipo="email"
                  />
                 <CodeplexCampoTexto 
                    etiqueta="Teléfono" 
                    valor={form.telefono ?? ''} 
                    alCambiar={(e) => actualizar('telefono', e.target.value)} 
                  />
                  <div style={{ borderTop: '1px solid #f3f4f6', margin: '8px 0' }} />
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Notificaciones</p>
                  <CodeplexInterruptor
                    etiqueta="Alertar por WhatsApp"
                    seleccionado={form.notificar_whatsapp ?? false}
                    alCambiar={(_e, checked) => actualizar('notificar_whatsapp', checked)}
                  />
                  <CodeplexInterruptor
                    etiqueta="Alertar por Email"
                    seleccionado={form.notificar_email ?? false}
                    alCambiar={(_e, checked) => actualizar('notificar_email', checked)}
                  />
              </CodeplexPila>
            </CodeplexTarjeta>

          </CodeplexPila>
        </CodeplexCuadricula>
      </CodeplexCuadricula>
    </CodeplexPila>
  );
}
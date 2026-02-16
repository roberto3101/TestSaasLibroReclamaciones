import { useState, useEffect } from 'react';
import { http } from '@/api/http';

interface Sede {
  id: string;
  nombre: string;
  slug: string;
  es_principal: boolean;
  direccion: string;
  deleted_at?: string | null;
}

interface ConfiguracionTenant {
  slug: string;
}

interface Props {
  abierto: boolean;
  alCerrar: () => void;
}

export function ModalSedesPublicas({ abierto, alCerrar }: Props) {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [slugEmpresa, setSlugEmpresa] = useState<string>('');
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    if (abierto) {
      cargarDatos();
    }
  }, [abierto]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resSedes, resConfig] = await Promise.all([
        http.get('/sedes'),
        http.get('/configuracion'),
      ]);

      const sedesActivas = (resSedes.data.data || resSedes.data).filter((s: Sede) => !s.deleted_at);
      const sedesOrdenadas = [...sedesActivas].sort((a: Sede, b: Sede) => {
        if (a.es_principal) return -1;
        if (b.es_principal) return 1;
        return a.nombre.localeCompare(b.nombre);
      });

      setSedes(sedesOrdenadas);
      setSlugEmpresa(resConfig.data.data?.slug || resConfig.data.slug);
    } catch (error) {
      console.error('Error cargando sedes:', error);
    } finally {
      setCargando(false);
    }
  };

  const generarUrl = (sede: Sede): string => {
    if (sede.es_principal) {
      return `/libro-publico/${slugEmpresa}`;
    }
    return `/libro-publico/${slugEmpresa}/${sede.slug}`;
  };

  const copiarEnlace = (sede: Sede) => {
    const url = generarUrl(sede);
    const urlCompleta = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(urlCompleta);
    setCopiado(sede.id);
    setTimeout(() => setCopiado(null), 2000);
  };

  const abrirEnNuevaPestana = (sede: Sede) => {
    const url = generarUrl(sede);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity ${
        abierto ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Acceder al Libro Público</h2>
          <button
            onClick={alCerrar}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {cargando ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Cargando sedes...</p>
            </div>
          ) : sedes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No hay sedes disponibles</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sedes.map((sede) => (
                <div
                  key={sede.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                        {sede.nombre}
                        {sede.es_principal && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Principal
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 font-mono truncate">
                        {generarUrl(sede)}
                      </p>
                      {sede.direccion && (
                        <p className="text-xs text-gray-500 mt-1">
                          {sede.direccion}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => copiarEnlace(sede)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors relative"
                        title="Copiar enlace"
                      >
                        {copiado === sede.id ? (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => abrirEnNuevaPestana(sede)}
                        className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Abrir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
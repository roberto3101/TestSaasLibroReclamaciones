import { useState } from 'react';
import { CodeplexPila } from '@codeplex-sac/layout';
import { CodeplexBoton } from '@codeplex-sac/ui';
import { CodeplexIconoRefrescar } from '@codeplex-sac/icons';
import { usarReclamos } from '../ganchos/usarReclamos';
import { usarSedes } from '@/modulos/sedes/ganchos/usarSedes';
import { TablaReclamos } from '../componentes/TablaReclamos';
import { reclamosApi } from '../api/reclamos.api';
import { notificar } from '@/aplicacion/helpers/toast';

type Periodo = '' | 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado';

const descargarBlob = (blob: Blob, nombre: string, tipo: string) => {
  const url = URL.createObjectURL(new Blob([blob], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
};

const construirParams = (sedeId: string, periodo: Periodo, fechaDesde: string, fechaHasta: string) => {
  const params: Record<string, string> = {};
  if (sedeId) params.sede_id = sedeId;
  if (periodo && periodo !== 'personalizado') params.periodo = periodo;
  if (periodo === 'personalizado') {
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
  }
  return params;
};

export default function PaginaReclamos() {
  const [sedeId, setSedeId] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);

 const { sedes } = usarSedes();

  const filtrosTabla = construirParams(sedeId, periodo, fechaDesde, fechaHasta);
  const { datos, cargando, pagina, cambiarPagina, recargar } = usarReclamos(1, 20, Object.keys(filtrosTabla).length > 0 ? filtrosTabla : undefined);

  const exportar = async (formato: 'pdf' | 'excel') => {
    setExportando(formato);
    try {
      const params = construirParams(sedeId, periodo, fechaDesde, fechaHasta);
      if (formato === 'pdf') {
        const blob = await reclamosApi.exportarPDF(params);
        descargarBlob(blob, `reclamos_${Date.now()}.pdf`, 'application/pdf');
      } else {
        const blob = await reclamosApi.exportarExcel(params);
        descargarBlob(blob, `reclamos_${Date.now()}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      }
      notificar.exito(`${formato.toUpperCase()} descargado`);
    } catch {
      notificar.error(`Error al exportar ${formato.toUpperCase()}`);
    } finally {
      setExportando(null);
    }
  };

  const estiloSelect: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db',
    fontSize: '0.8rem', color: '#374151', backgroundColor: '#fff',
    cursor: 'pointer', outline: 'none',
  };

  const estiloBoton: React.CSSProperties = {
    padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db',
    fontSize: '0.8rem', fontWeight: 500, color: '#374151', background: '#fff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
    opacity: exportando ? 0.6 : 1,
  };

  const estiloInput: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db',
    fontSize: '0.8rem', color: '#374151', outline: 'none', width: 140,
  };

  return (
    <CodeplexPila direccion="columna" espaciado={3}>
      <CodeplexPila direccion="fila" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <h2 style={{ margin: 0 }}>Gestión de Reclamos</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

          <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} style={{ ...estiloSelect, minWidth: 160 }}>
            <option value="">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>

          <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} style={{ ...estiloSelect, minWidth: 140 }}>
            <option value="">Todo el periodo</option>
            <option value="hoy">Hoy</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
            <option value="anio">Este año</option>
            <option value="personalizado">Personalizado</option>
          </select>

          {periodo === 'personalizado' && (
            <>
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={estiloInput} title="Desde" />
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={estiloInput} title="Hasta" />
            </>
          )}

          <button onClick={() => exportar('pdf')} disabled={!!exportando} style={estiloBoton}>
            {exportando === 'pdf' ? '⏳' : '📄'} PDF
          </button>
          <button onClick={() => exportar('excel')} disabled={!!exportando} style={estiloBoton}>
            {exportando === 'excel' ? '⏳' : '📊'} Excel
          </button>

          <CodeplexBoton texto="Actualizar" variante="contorno" iconoIzquierda={<CodeplexIconoRefrescar />} alHacerClick={recargar} />
        </div>
      </CodeplexPila>

      <TablaReclamos
        reclamos={datos?.data ?? []}
        total={datos?.total_pages ?? 0}
        pagina={pagina}
        cargando={cargando}
        alCambiarPagina={cambiarPagina}
      />
    </CodeplexPila>
  );
}
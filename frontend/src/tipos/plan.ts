export interface Plan {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  precio_mensual: number;
  precio_anual: number;
  max_sedes: number;
  max_usuarios: number;
  max_reclamos_mes: number;
  max_chatbots: number;
  permite_chatbot: boolean;
  permite_whatsapp: boolean;
  permite_email: boolean;
  permite_reportes_pdf: boolean;
  permite_exportar_excel: boolean;
  permite_api: boolean;
  permite_marca_blanca: boolean;
  permite_multi_idioma: boolean;
  max_storage_mb: number;
  orden: number;
  activo: boolean;
  destacado: boolean;
  fecha_creacion: string;
}

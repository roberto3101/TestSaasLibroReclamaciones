package dto

type CreateMensajeRequest struct {
	Mensaje       string `json:"mensaje" binding:"required"`
	TipoMensaje   string `json:"tipo_mensaje" binding:"required,oneof=CLIENTE EMPRESA"`
	ArchivoURL    string `json:"archivo_url"`
	ArchivoNombre string `json:"archivo_nombre"`
}
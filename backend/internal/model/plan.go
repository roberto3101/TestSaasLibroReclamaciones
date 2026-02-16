package model

import (
	"time"

	"github.com/google/uuid"
)

type Plan struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Codigo      string    `json:"codigo" db:"codigo"`
	Nombre      string    `json:"nombre" db:"nombre"`
	Descripcion NullString `json:"descripcion" db:"descripcion"`

	// Precios
	PrecioMensual float64    `json:"precio_mensual" db:"precio_mensual"`
	PrecioAnual   NullFloat64 `json:"precio_anual" db:"precio_anual"`

	// Límites
	MaxSedes       int `json:"max_sedes" db:"max_sedes"`
	MaxUsuarios    int `json:"max_usuarios" db:"max_usuarios"`
	MaxReclamosMes int `json:"max_reclamos_mes" db:"max_reclamos_mes"`
	MaxChatbots    int `json:"max_chatbots" db:"max_chatbots"`

	// Funcionalidades
	PermiteChatbot       bool `json:"permite_chatbot" db:"permite_chatbot"`
	PermiteWhatsapp      bool `json:"permite_whatsapp" db:"permite_whatsapp"`
	PermiteEmail         bool `json:"permite_email" db:"permite_email"`
	PermiteReportesPDF   bool `json:"permite_reportes_pdf" db:"permite_reportes_pdf"`
	PermiteExportarExcel bool `json:"permite_exportar_excel" db:"permite_exportar_excel"`
	PermiteAPI           bool `json:"permite_api" db:"permite_api"`
	PermiteMarcaBlanca   bool `json:"permite_marca_blanca" db:"permite_marca_blanca"`
	PermiteMultiIdioma   bool `json:"permite_multi_idioma" db:"permite_multi_idioma"`

	// Storage
	MaxStorageMB int `json:"max_storage_mb" db:"max_storage_mb"`

	// Display
	Orden     int  `json:"orden" db:"orden"`
	Activo    bool `json:"activo" db:"activo"`
	Destacado bool `json:"destacado" db:"destacado"`

	FechaCreacion time.Time `json:"fecha_creacion" db:"fecha_creacion"`
}

// IsUnlimited verifica si un límite es ilimitado (-1).
func IsUnlimited(limit int) bool {
	return limit == -1
}

// WithinLimit verifica si el uso actual está dentro del límite.
// Retorna true si aún hay espacio, o si el límite es ilimitado.
func WithinLimit(current, limit int) bool {
	return IsUnlimited(limit) || current < limit
}

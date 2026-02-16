package model

import "github.com/google/uuid"

// UsoTenant representa el resultado de la vista v_uso_tenant.
// El backend la consulta antes de cada operación limitada por plan.
type UsoTenant struct {
	TenantID uuid.UUID `json:"tenant_id" db:"tenant_id"`

	// Plan
	PlanCodigo         string     `json:"plan_codigo" db:"plan_codigo"`
	PlanNombre         string     `json:"plan_nombre" db:"plan_nombre"`
	SuscripcionEstado  string     `json:"suscripcion_estado" db:"suscripcion_estado"`
	SuscripcionFechaFin NullTime  `json:"suscripcion_fecha_fin" db:"suscripcion_fecha_fin"`

	// Límites efectivos (ya con override aplicado)
	LimiteSedes       int `json:"limite_sedes" db:"limite_sedes"`
	LimiteUsuarios    int `json:"limite_usuarios" db:"limite_usuarios"`
	LimiteReclamosMes int `json:"limite_reclamos_mes" db:"limite_reclamos_mes"`
	LimiteChatbots    int `json:"limite_chatbots" db:"limite_chatbots"`
	LimiteStorageMB   int `json:"limite_storage_mb" db:"limite_storage_mb"`

	// Funcionalidades
	PermiteChatbot       bool `json:"permite_chatbot" db:"permite_chatbot"`
	PermiteWhatsapp      bool `json:"permite_whatsapp" db:"permite_whatsapp"`
	PermiteEmail         bool `json:"permite_email" db:"permite_email"`
	PermiteReportesPDF   bool `json:"permite_reportes_pdf" db:"permite_reportes_pdf"`
	PermiteExportarExcel bool `json:"permite_exportar_excel" db:"permite_exportar_excel"`
	PermiteAPI           bool `json:"permite_api" db:"permite_api"`
	PermiteMarcaBlanca   bool `json:"permite_marca_blanca" db:"permite_marca_blanca"`

	// Uso actual
	UsoSedes       int `json:"uso_sedes" db:"uso_sedes"`
	UsoUsuarios    int `json:"uso_usuarios" db:"uso_usuarios"`
	UsoReclamosMes int `json:"uso_reclamos_mes" db:"uso_reclamos_mes"`
	UsoChatbots    int `json:"uso_chatbots" db:"uso_chatbots"`
}

// CanCreateSede verifica si puede crear otra sede.
func (u *UsoTenant) CanCreateSede() bool {
	return WithinLimit(u.UsoSedes, u.LimiteSedes)
}

// CanCreateUsuario verifica si puede crear otro usuario admin.
func (u *UsoTenant) CanCreateUsuario() bool {
	return WithinLimit(u.UsoUsuarios, u.LimiteUsuarios)
}

// CanCreateReclamo verifica si puede registrar otro reclamo este mes.
func (u *UsoTenant) CanCreateReclamo() bool {
	return WithinLimit(u.UsoReclamosMes, u.LimiteReclamosMes)
}

// CanCreateChatbot verifica si puede crear otro chatbot.
func (u *UsoTenant) CanCreateChatbot() bool {
	return u.PermiteChatbot && WithinLimit(u.UsoChatbots, u.LimiteChatbots)
}

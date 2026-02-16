package dto

// CreateSedeRequest — POST /api/v1/sedes
type CreateSedeRequest struct {
	Nombre            string   `json:"nombre" binding:"required"`
	Slug              string   `json:"slug" binding:"required"`
	CodigoSede        string   `json:"codigo_sede"`
	Direccion         string   `json:"direccion" binding:"required"`
	Departamento      string   `json:"departamento"`
	Provincia         string   `json:"provincia"`
	Distrito          string   `json:"distrito"`
	Referencia        string   `json:"referencia"`
	Telefono          string   `json:"telefono"`
	Email             string   `json:"email"`
	ResponsableNombre string   `json:"responsable_nombre"`
	ResponsableCargo  string   `json:"responsable_cargo"`
	HorarioAtencion   []any    `json:"horario_atencion"` // JSONB — ej: [{"dia":"lunes","inicio":"08:00","fin":"18:00"}]
	Latitud           *float64 `json:"latitud"`          // Puntero para distinguir 0 de ausente
	Longitud          *float64 `json:"longitud"`
	EsPrincipal       bool     `json:"es_principal"`
}

// UpdateSedeRequest — PUT /api/v1/sedes/:id
type UpdateSedeRequest struct {
	Nombre            string   `json:"nombre" binding:"required"`
	Slug              string   `json:"slug" binding:"required"`
	CodigoSede        string   `json:"codigo_sede"`
	Direccion         string   `json:"direccion" binding:"required"`
	Departamento      string   `json:"departamento"`
	Provincia         string   `json:"provincia"`
	Distrito          string   `json:"distrito"`
	Referencia        string   `json:"referencia"`
	Telefono          string   `json:"telefono"`
	Email             string   `json:"email"`
	ResponsableNombre string   `json:"responsable_nombre"`
	ResponsableCargo  string   `json:"responsable_cargo"`
	HorarioAtencion   []any    `json:"horario_atencion"`
	Latitud           *float64 `json:"latitud"`
	Longitud          *float64 `json:"longitud"`
	EsPrincipal       bool     `json:"es_principal"`
}

// SedeResponse — respuesta al frontend (consistente)
type SedeResponse struct {
	ID                string   `json:"id"`
	TenantID          string   `json:"tenant_id"`
	Nombre            string   `json:"nombre"`
	Slug              string   `json:"slug"`
	CodigoSede        *string  `json:"codigo_sede"`
	Direccion         string   `json:"direccion"`
	Departamento      *string  `json:"departamento"`
	Provincia         *string  `json:"provincia"`
	Distrito          *string  `json:"distrito"`
	Referencia        *string  `json:"referencia"`
	Telefono          *string  `json:"telefono"`
	Email             *string  `json:"email"`
	ResponsableNombre *string  `json:"responsable_nombre"`
	ResponsableCargo  *string  `json:"responsable_cargo"`
	HorarioAtencion   any      `json:"horario_atencion"` // JSON array o null
	Latitud           *float64 `json:"latitud"`
	Longitud          *float64 `json:"longitud"`
	Activo            bool     `json:"activo"`
	EsPrincipal       bool     `json:"es_principal"`
	FechaCreacion     string   `json:"fecha_creacion"`
	FechaActualizacion string  `json:"fecha_actualizacion"`
}
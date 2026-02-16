package model

type Tenant struct {
	TenantModel

	// Datos legales
	RazonSocial     string     `json:"razon_social" db:"razon_social"`
	RUC             string     `json:"ruc" db:"ruc"`
	NombreComercial NullString `json:"nombre_comercial" db:"nombre_comercial"`
	DireccionLegal  NullString `json:"direccion_legal" db:"direccion_legal"`
	Departamento    NullString `json:"departamento" db:"departamento"`
	Provincia       NullString `json:"provincia" db:"provincia"`
	Distrito        NullString `json:"distrito" db:"distrito"`
	Telefono        NullString `json:"telefono" db:"telefono"`
	EmailContacto   NullString `json:"email_contacto" db:"email_contacto"`

	// Branding
	LogoURL       NullString `json:"logo_url" db:"logo_url"`
	Slug          string     `json:"slug" db:"slug"`
	SitioWeb      NullString `json:"sitio_web" db:"sitio_web"`
	ColorPrimario string     `json:"color_primario" db:"color_primario"`

	// Config del libro
	PlazoRespuestaDias   int        `json:"plazo_respuesta_dias" db:"plazo_respuesta_dias"`
	MensajeConfirmacion  NullString `json:"mensaje_confirmacion" db:"mensaje_confirmacion"`
	NotificarWhatsapp    bool       `json:"notificar_whatsapp" db:"notificar_whatsapp"`
	NotificarEmail       bool       `json:"notificar_email" db:"notificar_email"`

	// Control
	Activo  bool `json:"activo" db:"activo"`
	Version int  `json:"version" db:"version"`

	Timestamps
}

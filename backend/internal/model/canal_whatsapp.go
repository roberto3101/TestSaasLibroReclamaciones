package model

// CanalWhatsApp representa la configuración de un número de WhatsApp Business
// asociado a un tenant. Permite resolver dinámicamente qué tenant atiende
// cada número cuando llega un mensaje desde Meta.
type CanalWhatsApp struct {
	TenantModel

	PhoneNumberID string `json:"phone_number_id" db:"phone_number_id"`
	DisplayPhone  string `json:"display_phone" db:"display_phone"`
	AccessToken   string `json:"-" db:"access_token"`   // Nunca se serializa a JSON
	VerifyToken   string `json:"-" db:"verify_token"`    // Nunca se serializa a JSON
	NombreCanal   string `json:"nombre_canal" db:"nombre_canal"`
	Activo        bool   `json:"activo" db:"activo"`

	Timestamps
}
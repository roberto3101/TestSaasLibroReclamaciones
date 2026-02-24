package dto

import "github.com/google/uuid"

type CreateUsuarioRequest struct {
	Email          string    `json:"email" binding:"required"`
	NombreCompleto string    `json:"nombre_completo" binding:"required"`
	Password       string    `json:"password" binding:"required,min=8"`
	Rol            string    `json:"rol" binding:"required,oneof=ADMIN SOPORTE"`
	SedeID         *uuid.UUID `json:"sede_id"`
}

type UpdateUsuarioRequest struct {
	NombreCompleto string    `json:"nombre_completo" binding:"required"`
	Rol            string    `json:"rol" binding:"required,oneof=ADMIN SOPORTE"`
	SedeID         *uuid.UUID `json:"sede_id"`
	Activo         bool      `json:"activo"`
}

type UsuarioResponse struct {
	ID             uuid.UUID  `json:"id"`
	Email          string     `json:"email"`
	NombreCompleto string     `json:"nombre_completo"`
	Rol            string     `json:"rol"`
	Activo         bool       `json:"activo"`
	SedeID         *uuid.UUID `json:"sede_id"`
	UltimoAcceso   *string    `json:"ultimo_acceso"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

type AdminResetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=8"`
}
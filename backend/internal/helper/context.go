package helper

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Claves del contexto. Definidas una sola vez para evitar typos.
const (
	CtxTenantID  = "tenant_id"
	CtxUserID    = "user_id"
	CtxUserRole  = "user_role"
	CtxChatbotID = "chatbot_id"
	CtxAPIKeyID  = "api_key_id"
	CtxSedeID    = "sede_id"
	CtxIPAddress = "ip_address"
)

// GetTenantID extrae el tenant_id del contexto. Falla si no existe.
func GetTenantID(c *gin.Context) (uuid.UUID, error) {
	return GetUUIDFromContext(c, CtxTenantID)
}

// GetUserID extrae el user_id del contexto.
func GetUserID(c *gin.Context) (uuid.UUID, error) {
	return GetUUIDFromContext(c, CtxUserID)
}

// GetChatbotID extrae el chatbot_id del contexto (para requests de chatbot).
func GetChatbotID(c *gin.Context) (uuid.UUID, error) {
	return GetUUIDFromContext(c, CtxChatbotID)
}

// GetUserRole extrae el rol del usuario del contexto.
func GetUserRole(c *gin.Context) string {
	role, _ := c.Get(CtxUserRole)
	if r, ok := role.(string); ok {
		return r
	}
	return ""
}

// GetUserSedeID extrae la sede asignada del usuario. Retorna nil si no tiene (acceso global).
func GetUserSedeID(c *gin.Context) *uuid.UUID {
	val, exists := c.Get(CtxSedeID)
	if !exists {
		return nil
	}
	id, ok := val.(uuid.UUID)
	if !ok {
		return nil
	}
	return &id
}

// GetClientIP retorna la IP real del cliente.
func GetClientIP(c *gin.Context) string {
	return c.ClientIP()
}

// SetContext guarda un valor en el contexto de gin.
func SetContext(c *gin.Context, key string, value interface{}) {
	c.Set(key, value)
}

// GetUUIDFromContext extrae un UUID del contexto por clave.
func GetUUIDFromContext(c *gin.Context, key string) (uuid.UUID, error) {
	val, exists := c.Get(key)
	if !exists {
		return uuid.Nil, errors.New(key + " no encontrado en contexto")
	}
	id, ok := val.(uuid.UUID)
	if !ok {
		return uuid.Nil, errors.New(key + " tiene formato inválido")
	}
	return id, nil
}
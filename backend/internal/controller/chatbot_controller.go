package controller

import (
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/model/dto"
	"libro-reclamaciones/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ChatbotController struct {
	chatbotService *service.ChatbotService
}

func NewChatbotController(chatbotService *service.ChatbotService) *ChatbotController {
	return &ChatbotController{chatbotService: chatbotService}
}

// GetAll GET /api/v1/chatbots
func (ctrl *ChatbotController) GetAll(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	chatbots, err := ctrl.chatbotService.GetByTenant(c.Request.Context(), tenantID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, chatbots)
}

// GetByID GET /api/v1/chatbots/:id
func (ctrl *ChatbotController) GetByID(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	chatbotID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de chatbot inválido")
		return
	}

	chatbot, err := ctrl.chatbotService.GetByID(c.Request.Context(), tenantID, chatbotID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, chatbot)
}

// Create POST /api/v1/chatbots
func (ctrl *ChatbotController) Create(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}
	userID, _ := helper.GetUserID(c)

	var req dto.CreateChatbotRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "nombre y tipo son obligatorios")
		return
	}

	chatbot, err := ctrl.chatbotService.Create(
		c.Request.Context(), tenantID,
		req.Nombre, req.Tipo, req.Descripcion, userID,
	)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Created(c, chatbot)
}

// Update PUT /api/v1/chatbots/:id
func (ctrl *ChatbotController) Update(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	chatbotID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de chatbot inválido")
		return
	}

	var req dto.UpdateChatbotRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "nombre y tipo son obligatorios")
		return
	}

	if err := ctrl.chatbotService.Update(
		c.Request.Context(), tenantID, chatbotID,
		req.Nombre, req.Tipo, req.Descripcion, req.Activo,
	); err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, gin.H{"message": "Chatbot actualizado"})
}

// Deactivate POST /api/v1/chatbots/:id/deactivate
// Desactiva el chatbot y revoca todas sus API keys.
func (ctrl *ChatbotController) Deactivate(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	chatbotID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de chatbot inválido")
		return
	}

	if err := ctrl.chatbotService.Deactivate(c.Request.Context(), tenantID, chatbotID); err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, gin.H{"message": "Chatbot desactivado y API keys revocadas"})
}

// Reactivate POST /api/v1/chatbots/:id/reactivate
// Reactiva un chatbot. Las API keys deben generarse de nuevo.
func (ctrl *ChatbotController) Reactivate(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	chatbotID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de chatbot inválido")
		return
	}

	if err := ctrl.chatbotService.Reactivate(c.Request.Context(), tenantID, chatbotID); err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, gin.H{"message": "Chatbot reactivado"})
}

// Delete DELETE /api/v1/chatbots/:id
// Eliminación lógica: desactiva chatbot + revoca todas las API keys.
func (ctrl *ChatbotController) Delete(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	chatbotID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de chatbot inválido")
		return
	}

	if err := ctrl.chatbotService.Delete(c.Request.Context(), tenantID, chatbotID); err != nil {
		helper.Error(c, err)
		return
	}
	helper.NoContent(c)
}

// --- API Keys ---

// GetAPIKeys GET /api/v1/chatbots/:id/api-keys
func (ctrl *ChatbotController) GetAPIKeys(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	chatbotID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de chatbot inválido")
		return
	}

	keys, err := ctrl.chatbotService.GetAPIKeys(c.Request.Context(), tenantID, chatbotID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, keys)
}

// GenerateAPIKey POST /api/v1/chatbots/:id/api-keys
func (ctrl *ChatbotController) GenerateAPIKey(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}
	userID, _ := helper.GetUserID(c)

	chatbotID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de chatbot inválido")
		return
	}

	var req dto.CreateAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "nombre y entorno son obligatorios")
		return
	}

	key, plainKey, err := ctrl.chatbotService.GenerateAPIKey(
		c.Request.Context(), tenantID, chatbotID,
		req.Nombre, req.Entorno, userID,
	)
	if err != nil {
		helper.Error(c, err)
		return
	}

	helper.Created(c, dto.APIKeyResponse{
		ID:        key.ID,
		Nombre:    key.Nombre,
		KeyPrefix: key.KeyPrefix,
		PlainKey:  plainKey,
		Entorno:   key.Entorno,
		Activa:    key.Activa,
	})
}

// RevokeAPIKey DELETE /api/v1/chatbots/:id/api-keys/:keyId
func (ctrl *ChatbotController) RevokeAPIKey(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	keyID, err := uuid.Parse(c.Param("keyId"))
	if err != nil {
		helper.ValidationError(c, "ID de API key inválido")
		return
	}

	if err := ctrl.chatbotService.RevokeAPIKey(c.Request.Context(), tenantID, keyID); err != nil {
		helper.Error(c, err)
		return
	}
	helper.NoContent(c)
}
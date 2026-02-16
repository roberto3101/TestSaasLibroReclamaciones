package router

import (
	"libro-reclamaciones/internal/controller"

	"github.com/gin-gonic/gin"
)

func RegisterAssistantRoutes(r *gin.Engine, ctrl *controller.AssistantController, authMw, tenantMw gin.HandlerFunc) {
	assistant := r.Group("/api/v1/assistant")
	assistant.Use(authMw, tenantMw)
	{
		assistant.POST("/chat", ctrl.Chat)
		assistant.GET("/conversations", ctrl.ListarConversaciones)
		assistant.GET("/conversations/:id/messages", ctrl.ObtenerMensajes)
		assistant.DELETE("/conversations/:id", ctrl.EliminarConversacion)
		assistant.GET("/health", ctrl.Health)
	}
}

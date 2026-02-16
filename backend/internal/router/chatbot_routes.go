package router

import (
	"libro-reclamaciones/internal/controller"
	"libro-reclamaciones/internal/middleware"
	"libro-reclamaciones/internal/model"

	"github.com/gin-gonic/gin"
)

func RegisterChatbotRoutes(r *gin.Engine, ctrl *controller.ChatbotController, authMw, tenantMw gin.HandlerFunc) {
	chatbots := r.Group("/api/v1/chatbots")
	chatbots.Use(authMw, tenantMw, middleware.RoleMiddleware(model.RolAdmin))
	{
		chatbots.GET("", ctrl.GetAll)
		chatbots.GET("/:id", ctrl.GetByID)
		chatbots.POST("", ctrl.Create)
		chatbots.PUT("/:id", ctrl.Update)
		chatbots.DELETE("/:id", ctrl.Delete)

		// Lifecycle
		chatbots.POST("/:id/deactivate", ctrl.Deactivate)
		chatbots.POST("/:id/reactivate", ctrl.Reactivate)

		// API Keys
		chatbots.GET("/:id/api-keys", ctrl.GetAPIKeys)
		chatbots.POST("/:id/api-keys", ctrl.GenerateAPIKey)
		chatbots.DELETE("/:id/api-keys/:keyId", ctrl.RevokeAPIKey)
	}
}
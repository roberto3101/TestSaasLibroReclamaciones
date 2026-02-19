package router

import (
	"libro-reclamaciones/internal/controller"
	"libro-reclamaciones/internal/middleware"
	"libro-reclamaciones/internal/model"

	"github.com/gin-gonic/gin"
)

// RegisterWhatsAppConfigRoutes rutas admin para gestionar canales WhatsApp.
// Solo accesible por usuarios con rol ADMIN autenticados.
func RegisterWhatsAppConfigRoutes(r *gin.Engine, ctrl *controller.WhatsAppConfigController, authMw, tenantMw gin.HandlerFunc) {
	canales := r.Group("/api/v1/canales/whatsapp")
	canales.Use(authMw, tenantMw, middleware.RoleMiddleware(model.RolAdmin))
	{
		canales.GET("", ctrl.GetAll)
		canales.GET("/:id", ctrl.GetByID)
		canales.POST("", ctrl.Create)
		canales.PUT("/:id", ctrl.Update)
		canales.DELETE("/:id", ctrl.Deactivate)
	}
}
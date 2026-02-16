package router

import (
	"libro-reclamaciones/internal/controller"

	"github.com/gin-gonic/gin"
)

func RegisterMensajeRoutes(r *gin.Engine, ctrl *controller.MensajeController, authMw, tenantMw gin.HandlerFunc) {
	mensajes := r.Group("/api/v1/reclamos")
	mensajes.Use(authMw, tenantMw)
	{
		mensajes.GET("/:id/mensajes", ctrl.GetByReclamo)
		mensajes.POST("/:id/mensajes", ctrl.Create)
	}
}
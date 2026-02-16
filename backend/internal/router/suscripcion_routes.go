package router

import (
	"libro-reclamaciones/internal/controller"

	"github.com/gin-gonic/gin"
)

func RegisterSuscripcionRoutes(r *gin.Engine, ctrl *controller.SuscripcionController, authMw, tenantMw gin.HandlerFunc) {
	sus := r.Group("/api/v1/suscripcion")
	sus.Use(authMw, tenantMw)
	{
		sus.GET("", ctrl.GetActiva)
		sus.GET("/historial", ctrl.GetHistorial)
		sus.POST("/cambiar-plan", ctrl.CambiarPlan)
	}
}
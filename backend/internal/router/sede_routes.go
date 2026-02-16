package router

import (
	"libro-reclamaciones/internal/controller"

	"github.com/gin-gonic/gin"
)

func RegisterSedeRoutes(r *gin.Engine, ctrl *controller.SedeController, authMw, tenantMw gin.HandlerFunc) {
	sedes := r.Group("/api/v1/sedes")
	sedes.Use(authMw, tenantMw)
	{
		sedes.GET("", ctrl.GetAll)
		sedes.GET("/:id", ctrl.GetByID)
		sedes.POST("", ctrl.Create)
		sedes.PUT("/:id", ctrl.Update)
		sedes.DELETE("/:id", ctrl.Deactivate)
	}
}
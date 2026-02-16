package router

import (
	"libro-reclamaciones/internal/controller"

	"github.com/gin-gonic/gin"
)

func RegisterReclamoRoutes(r *gin.Engine, ctrl *controller.ReclamoController, authMw, tenantMw gin.HandlerFunc) {
	reclamos := r.Group("/api/v1/reclamos")
	reclamos.Use(authMw, tenantMw)
	{
		reclamos.GET("", ctrl.GetAll)
		reclamos.GET("/:id", ctrl.GetByID)
		reclamos.POST("/:id/estado", ctrl.CambiarEstado)
		reclamos.POST("/:id/asignar", ctrl.Asignar)
	}
}
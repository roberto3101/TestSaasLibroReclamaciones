package router

import (
	"libro-reclamaciones/internal/controller"

	"github.com/gin-gonic/gin"
)

func RegisterRespuestaRoutes(r *gin.Engine, ctrl *controller.RespuestaController, authMw, tenantMw gin.HandlerFunc) {
	respuestas := r.Group("/api/v1/reclamos")
	respuestas.Use(authMw, tenantMw)
	{
		respuestas.GET("/:id/respuestas", ctrl.GetByReclamo)
		respuestas.POST("/:id/respuestas", ctrl.Create)
	}
}
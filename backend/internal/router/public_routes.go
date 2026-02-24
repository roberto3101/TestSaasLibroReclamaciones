package router

import (
	"libro-reclamaciones/internal/controller"

	"github.com/gin-gonic/gin"
)

func RegisterPublicRoutes(r *gin.Engine, ctrl *controller.PublicController) {
	libro := r.Group("/libro/:slug")
	{
		libro.GET("/tenant", ctrl.GetTenant)
		libro.GET("/sedes", ctrl.GetSedes)
		libro.POST("/reclamos", ctrl.CrearReclamo)
		libro.GET("/seguimiento/:codigo", ctrl.ConsultarSeguimiento)
		libro.GET("/seguimiento/:codigo/mensajes", ctrl.ListarMensajesPublico)
		libro.POST("/seguimiento/:codigo/mensajes", ctrl.EnviarMensajePublico)
	}
}
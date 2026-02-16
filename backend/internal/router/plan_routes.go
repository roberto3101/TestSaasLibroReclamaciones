package router

import (
	"libro-reclamaciones/internal/controller"

	"github.com/gin-gonic/gin"
)

// RegisterLibroPublicoRoutes rutas públicas del libro (sin auth)
func RegisterLibroPublicoRoutes(r *gin.Engine, publicCtrl *controller.PublicController) {
	libro := r.Group("/libro")
	{
		// Rutas existentes (Intactas)
		libro.GET("/:slug/tenant", publicCtrl.GetTenant)
		libro.GET("/:slug/sedes", publicCtrl.GetSedes)
		libro.POST("/:slug/reclamos", publicCtrl.CrearReclamo)

		// Nuevas rutas de Seguimiento y Chat
		libro.GET("/:slug/seguimiento/:codigo", publicCtrl.ConsultarSeguimiento)
		libro.GET("/:slug/seguimiento/:codigo/mensajes", publicCtrl.ListarMensajesPublico)
		libro.POST("/:slug/seguimiento/:codigo/mensajes", publicCtrl.EnviarMensajePublico)
	}
}

// RegisterPlanRoutes rutas protegidas de planes (con auth)
func RegisterPlanRoutes(r *gin.Engine, ctrl *controller.PlanController, authMw, tenantMw gin.HandlerFunc) {
	planes := r.Group("/api/v1/planes")
	planes.Use(authMw, tenantMw)
	{
		planes.GET("", ctrl.GetAll)
		planes.GET("/:id", ctrl.GetByID)
	}
}
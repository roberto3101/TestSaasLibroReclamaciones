package router

import (
	"libro-reclamaciones/internal/controller"

	"github.com/gin-gonic/gin"
)

// RegisterSolicitudAsesorRoutes registra las rutas de atención en vivo (solicitudes de asesor).
func RegisterSolicitudAsesorRoutes(
	r *gin.Engine,
	ctrl *controller.SolicitudAsesorController,
	msgCtrl *controller.MensajeAtencionController,
	authMw gin.HandlerFunc,
	tenantMw gin.HandlerFunc,
) {
	solicitudes := r.Group("/api/v1/solicitudes-asesor").Use(authMw, tenantMw)
	{
		solicitudes.GET("", ctrl.GetAbiertas)                       // Listar abiertas (panel principal)
		solicitudes.GET("/pendientes/count", ctrl.ContarPendientes) // Badge sidebar
		solicitudes.GET("/mis-solicitudes", ctrl.GetMisSolicitudes) // Mis asignadas
		solicitudes.GET("/estado/:estado", ctrl.GetByEstado)        // Filtrar por estado
		solicitudes.GET("/:id", ctrl.GetByID)                      // Detalle

		solicitudes.POST("", ctrl.Crear)                         // Crear manual
		solicitudes.POST("/:id/asignar", ctrl.Asignar)           // Asignar asesor
		solicitudes.POST("/:id/tomar", ctrl.Tomar)               // Auto-asignarse
		solicitudes.POST("/:id/resolver", ctrl.Resolver)         // Marcar resuelta
		solicitudes.POST("/:id/cancelar", ctrl.Cancelar)         // Cancelar
		solicitudes.PATCH("/:id/prioridad", ctrl.ActualizarPrioridad)   // Cambiar prioridad
		solicitudes.PATCH("/:id/nota", ctrl.ActualizarNotaInterna)      // Editar nota

		// Chat en vivo (mensajes asesor ↔ cliente)
		solicitudes.GET("/:id/mensajes", msgCtrl.ListarMensajes)    // Polling: listar mensajes
		solicitudes.POST("/:id/mensajes", msgCtrl.EnviarMensaje)    // Asesor envía mensaje
	}
}
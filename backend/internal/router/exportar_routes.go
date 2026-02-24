package router

import (
	"libro-reclamaciones/internal/controller"

	"github.com/gin-gonic/gin"
)

func RegistrarRutasExportacion(r *gin.Engine, ctrl *controller.ExportarControlador, authMw, tenantMw gin.HandlerFunc) {
	exportar := r.Group("/api/v1/reclamos/exportar")
	exportar.Use(authMw, tenantMw)
	{
		exportar.GET("/pdf", ctrl.ExportarPDF)
		exportar.GET("/excel", ctrl.ExportarExcel)
	}
}
package router

import (
	"libro-reclamaciones/internal/controller"

	"github.com/gin-gonic/gin"
)

func RegisterDashboardRoutes(r *gin.Engine, ctrl *controller.DashboardController, authMw, tenantMw gin.HandlerFunc) {
	dashboard := r.Group("/api/v1/dashboard")
	dashboard.Use(authMw, tenantMw)
	{
		dashboard.GET("/uso", ctrl.GetUso)
	}
}
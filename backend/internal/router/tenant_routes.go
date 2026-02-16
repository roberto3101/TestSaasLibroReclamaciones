package router

import (
	"libro-reclamaciones/internal/controller"

	"github.com/gin-gonic/gin"
)

func RegisterTenantRoutes(r *gin.Engine, ctrl *controller.TenantController, authMw, tenantMw gin.HandlerFunc) {
	tenant := r.Group("/api/v1/tenant")
	tenant.Use(authMw, tenantMw)
	{
		tenant.GET("", ctrl.Get)
		tenant.PUT("", ctrl.Update)
	}
}
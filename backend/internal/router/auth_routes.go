package router

import (
	"libro-reclamaciones/internal/controller"

	"github.com/gin-gonic/gin"
)

func RegisterAuthRoutes(r *gin.Engine, ctrl *controller.AuthController, authMw, tenantMw gin.HandlerFunc) {
	// Login NO necesita tenant middleware (el tenant se resuelve por email)
	auth := r.Group("/api/v1/auth")
	{
		auth.POST("/login", ctrl.Login)
	}

	// Logout requiere token válido + tenant activo
	authProtected := r.Group("/api/v1/auth")
	authProtected.Use(authMw, tenantMw)
	{
		authProtected.POST("/logout", ctrl.Logout)
	}
}
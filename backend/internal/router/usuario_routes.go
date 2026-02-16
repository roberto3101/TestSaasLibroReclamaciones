package router

import (
	"libro-reclamaciones/internal/controller"
	"libro-reclamaciones/internal/middleware"
	"libro-reclamaciones/internal/model"

	"github.com/gin-gonic/gin"
)

func RegisterUsuarioRoutes(r *gin.Engine, ctrl *controller.UsuarioController, authMw, tenantMw gin.HandlerFunc) {
	usuarios := r.Group("/api/v1/usuarios")
	usuarios.Use(authMw, tenantMw)
	{
		usuarios.GET("", ctrl.GetAll)
		usuarios.GET("/:id", ctrl.GetByID)
		usuarios.PUT("/password", ctrl.ChangePassword)

		// Solo ADMIN puede crear, editar y desactivar usuarios
		admin := usuarios.Group("")
		admin.Use(middleware.RoleMiddleware(model.RolAdmin))
		{
			admin.POST("", ctrl.Create)
			admin.PUT("/:id", ctrl.Update)
			admin.DELETE("/:id", ctrl.Deactivate)
		}
	}
}
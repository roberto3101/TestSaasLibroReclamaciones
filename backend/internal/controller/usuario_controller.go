package controller

import (
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/model/dto"
	"libro-reclamaciones/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UsuarioController struct {
	usuarioService *service.UsuarioService
}

func NewUsuarioController(usuarioService *service.UsuarioService) *UsuarioController {
	return &UsuarioController{usuarioService: usuarioService}
}

// GetAll GET /api/v1/usuarios
func (ctrl *UsuarioController) GetAll(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	usuarios, err := ctrl.usuarioService.GetByTenant(c.Request.Context(), tenantID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, usuarios)
}

// GetByID GET /api/v1/usuarios/:id
func (ctrl *UsuarioController) GetByID(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de usuario inválido")
		return
	}

	user, err := ctrl.usuarioService.GetByID(c.Request.Context(), tenantID, userID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, user)
}

// Create POST /api/v1/usuarios
func (ctrl *UsuarioController) Create(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}
	creadorID, _ := helper.GetUserID(c)

	var req dto.CreateUsuarioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "email, nombre_completo, password y rol son obligatorios")
		return
	}

	user, err := ctrl.usuarioService.Create(
		c.Request.Context(), tenantID,
		req.Email, req.NombreCompleto, req.Password, req.Rol, req.SedeID, creadorID,
	)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Created(c, user)
}

// Update PUT /api/v1/usuarios/:id
func (ctrl *UsuarioController) Update(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de usuario inválido")
		return
	}

	var req dto.UpdateUsuarioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "nombre_completo y rol son obligatorios")
		return
	}

	if err := ctrl.usuarioService.Update(
		c.Request.Context(), tenantID, userID,
		req.NombreCompleto, req.Rol, req.SedeID, req.Activo,
	); err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, gin.H{"message": "Usuario actualizado"})
}

// ChangePassword PUT /api/v1/usuarios/password
func (ctrl *UsuarioController) ChangePassword(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}
	userID, _ := helper.GetUserID(c)

	var req dto.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "current_password y new_password son obligatorios")
		return
	}

	if err := ctrl.usuarioService.ChangePassword(
		c.Request.Context(), tenantID, userID, req.CurrentPassword, req.NewPassword,
	); err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, gin.H{"message": "Contraseña actualizada"})
}

// AdminResetPassword PATCH /api/v1/usuarios/:id/password
func (ctrl *UsuarioController) AdminResetPassword(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID inválido")
		return
	}

	var req dto.AdminResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "password es obligatorio (mínimo 8 caracteres)")
		return
	}

	if err := ctrl.usuarioService.AdminResetPassword(c.Request.Context(), tenantID, userID, req.Password); err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, gin.H{"message": "Contraseña actualizada"})
}

// Deactivate DELETE /api/v1/usuarios/:id
func (ctrl *UsuarioController) Deactivate(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de usuario inválido")
		return
	}

	if err := ctrl.usuarioService.Deactivate(c.Request.Context(), tenantID, userID); err != nil {
		helper.Error(c, err)
		return
	}
	helper.NoContent(c)
}
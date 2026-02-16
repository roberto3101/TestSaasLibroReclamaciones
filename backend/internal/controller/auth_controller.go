package controller

import (
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/model/dto"
	"libro-reclamaciones/internal/service"

	"github.com/gin-gonic/gin"
)

type AuthController struct {
	authService *service.AuthService
}

func NewAuthController(authService *service.AuthService) *AuthController {
	return &AuthController{authService: authService}
}

// Login POST /api/v1/auth/login
func (ctrl *AuthController) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "email y password son obligatorios")
		return
	}

	result, err := ctrl.authService.Login(
		c.Request.Context(),
		req.Email, req.Password,
		helper.GetClientIP(c), c.GetHeader("User-Agent"),
	)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, result)
}

// Logout POST /api/v1/auth/logout
func (ctrl *AuthController) Logout(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if len(token) > 7 {
		tokenHash := helper.SHA256Hash(token[7:]) // Remove "Bearer "
		_ = ctrl.authService.Logout(c.Request.Context(), tokenHash)
	}
	helper.NoContent(c)
}
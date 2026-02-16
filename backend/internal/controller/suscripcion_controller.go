package controller

import (
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/service"

	"github.com/gin-gonic/gin"
)

type SuscripcionController struct {
	suscripcionService *service.SuscripcionService
}

func NewSuscripcionController(suscripcionService *service.SuscripcionService) *SuscripcionController {
	return &SuscripcionController{suscripcionService: suscripcionService}
}

// GetActiva GET /api/v1/suscripcion
func (ctrl *SuscripcionController) GetActiva(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	sus, err := ctrl.suscripcionService.GetActiva(c.Request.Context(), tenantID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, sus)
}

// GetHistorial GET /api/v1/suscripcion/historial
func (ctrl *SuscripcionController) GetHistorial(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	historial, err := ctrl.suscripcionService.GetHistorial(c.Request.Context(), tenantID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, historial)
}

// CambiarPlan body de la request.
type cambiarPlanRequest struct {
	PlanCodigo     string `json:"plan_codigo" binding:"required"`
	Ciclo          string `json:"ciclo"`
	ReferenciaPago string `json:"referencia_pago"`
	MetodoPago     string `json:"metodo_pago"`
}

// CambiarPlan POST /api/v1/suscripcion/cambiar-plan
func (ctrl *SuscripcionController) CambiarPlan(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	var req cambiarPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "plan_codigo es obligatorio")
		return
	}

	nueva, err := ctrl.suscripcionService.CambiarPlan(
		c.Request.Context(), tenantID,
		req.PlanCodigo, req.Ciclo, req.ReferenciaPago, req.MetodoPago, "UPGRADE",
	)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, nueva)
}
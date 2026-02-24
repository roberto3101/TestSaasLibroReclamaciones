package controller

import (
	"libro-reclamaciones/internal/apperror"
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DashboardController struct {
	dashboardRepo *repo.DashboardRepo
}

func NewDashboardController(dashboardRepo *repo.DashboardRepo) *DashboardController {
	return &DashboardController{dashboardRepo: dashboardRepo}
}

// GetUso GET /api/v1/dashboard/uso
func (ctrl *DashboardController) GetUso(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	uso, err := ctrl.dashboardRepo.GetUsoTenant(c.Request.Context(), tenantID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	if uso == nil {
		helper.Error(c, apperror.ErrSuscripcionInactiva)
		return
	}
	helper.Success(c, uso)
}

// GetMetricas GET /api/v1/dashboard/metricas
func (ctrl *DashboardController) GetMetricas(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	var sedeID *uuid.UUID
	if sedeParam := c.Query("sede_id"); sedeParam != "" {
		if parsed, err := uuid.Parse(sedeParam); err == nil {
			sedeID = &parsed
		}
	}

	metricas, err := ctrl.dashboardRepo.GetMetricas(c.Request.Context(), tenantID, sedeID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, metricas)
}
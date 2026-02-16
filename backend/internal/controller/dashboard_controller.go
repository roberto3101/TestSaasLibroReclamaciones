package controller

import (
	"libro-reclamaciones/internal/apperror"
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/repo"

	"github.com/gin-gonic/gin"
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
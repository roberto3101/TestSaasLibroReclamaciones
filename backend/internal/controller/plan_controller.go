package controller

import (
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PlanController struct {
	planService *service.PlanService
}

func NewPlanController(planService *service.PlanService) *PlanController {
	return &PlanController{planService: planService}
}

// GetAll GET /api/v1/planes
func (ctrl *PlanController) GetAll(c *gin.Context) {
	planes, err := ctrl.planService.GetAll(c.Request.Context())
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, planes)
}

// GetByID GET /api/v1/planes/:id
func (ctrl *PlanController) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de plan inválido")
		return
	}

	plan, err := ctrl.planService.GetByID(c.Request.Context(), id)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, plan)
}
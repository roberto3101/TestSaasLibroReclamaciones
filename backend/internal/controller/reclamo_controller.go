package controller

import (
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/model/dto"
	"libro-reclamaciones/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ReclamoController struct {
	reclamoService *service.ReclamoService
}

func NewReclamoController(reclamoService *service.ReclamoService) *ReclamoController {
	return &ReclamoController{reclamoService: reclamoService}
}

// GetAll GET /api/v1/reclamos
func (ctrl *ReclamoController) GetAll(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	pag := helper.ParsePagination(c)
	reclamos, total, err := ctrl.reclamoService.GetByTenant(c.Request.Context(), tenantID, pag)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, dto.NewPaginatedResponse(reclamos, total, pag.Page, pag.PerPage))
}

// GetByID GET /api/v1/reclamos/:id
func (ctrl *ReclamoController) GetByID(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	reclamoID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de reclamo inválido")
		return
	}

	reclamo, err := ctrl.reclamoService.GetByID(c.Request.Context(), tenantID, reclamoID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, reclamo)
}

// CambiarEstado POST /api/v1/reclamos/:id/estado
func (ctrl *ReclamoController) CambiarEstado(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}
	userID, _ := helper.GetUserID(c)

	reclamoID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de reclamo inválido")
		return
	}

	var req dto.UpdateEstadoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "estado es obligatorio")
		return
	}

	if err := ctrl.reclamoService.CambiarEstado(
		c.Request.Context(), tenantID, reclamoID, userID,
		req.Estado, req.Comentario, helper.GetClientIP(c),
	); err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, gin.H{"message": "Estado actualizado"})
}

// Asignar POST /api/v1/reclamos/:id/asignar
func (ctrl *ReclamoController) Asignar(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}
	userID, _ := helper.GetUserID(c)

	reclamoID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de reclamo inválido")
		return
	}

	var req dto.AsignarReclamoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "admin_id es obligatorio")
		return
	}

	if err := ctrl.reclamoService.Asignar(
		c.Request.Context(), tenantID, reclamoID, req.AdminID, userID, helper.GetClientIP(c),
	); err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, gin.H{"message": "Reclamo asignado"})
}
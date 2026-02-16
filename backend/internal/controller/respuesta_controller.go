package controller

import (
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/model/dto"
	"libro-reclamaciones/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RespuestaController struct {
	respuestaService *service.RespuestaService
}

func NewRespuestaController(respuestaService *service.RespuestaService) *RespuestaController {
	return &RespuestaController{respuestaService: respuestaService}
}

// GetByReclamo GET /api/v1/reclamos/:id/respuestas
func (ctrl *RespuestaController) GetByReclamo(c *gin.Context) {
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

	respuestas, err := ctrl.respuestaService.GetByReclamo(c.Request.Context(), tenantID, reclamoID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, respuestas)
}

// Create POST /api/v1/reclamos/:id/respuestas
func (ctrl *RespuestaController) Create(c *gin.Context) {
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

	var req dto.CreateRespuestaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "respuesta_empresa es obligatorio")
		return
	}

	resp, err := ctrl.respuestaService.Crear(
		c.Request.Context(), tenantID, reclamoID, userID,
		req.RespuestaEmpresa, req.AccionTomada, req.CompensacionOfrecida,
		req.CargoResponsable, helper.GetClientIP(c),
	)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Created(c, resp)
}
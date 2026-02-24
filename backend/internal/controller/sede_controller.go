package controller

import (
	"database/sql"
	"encoding/json"
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/model/dto"
	"libro-reclamaciones/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SedeController struct {
	sedeService *service.SedeService
}

func NewSedeController(sedeService *service.SedeService) *SedeController {
	return &SedeController{sedeService: sedeService}
}

// GetAll GET /api/v1/sedes
func (ctrl *SedeController) GetAll(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	sedes, err := ctrl.sedeService.GetByTenant(c.Request.Context(), tenantID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, sedes)
}

// GetByID GET /api/v1/sedes/:id
func (ctrl *SedeController) GetByID(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	sedeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de sede inválido")
		return
	}

	sede, err := ctrl.sedeService.GetByID(c.Request.Context(), tenantID, sedeID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, sede)
}

// Create POST /api/v1/sedes
func (ctrl *SedeController) Create(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	var req dto.CreateSedeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "nombre, slug y direccion son obligatorios")
		return
	}

	if !helper.ValidateSlug(req.Slug) {
		helper.ValidationError(c, "slug inválido (solo minúsculas, números y guiones)")
		return
	}

	sede := ctrl.mapCreateToModel(tenantID, &req)

	if err := ctrl.sedeService.Create(c.Request.Context(), sede); err != nil {
		helper.Error(c, err)
		return
	}
	helper.Created(c, sede)
}

// Update PUT /api/v1/sedes/:id
func (ctrl *SedeController) Update(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	sedeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de sede inválido")
		return
	}

	var req dto.UpdateSedeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "nombre, slug y direccion son obligatorios")
		return
	}

	if !helper.ValidateSlug(req.Slug) {
		helper.ValidationError(c, "slug inválido (solo minúsculas, números y guiones)")
		return
	}

	sede := ctrl.mapUpdateToModel(tenantID, sedeID, &req)

	if err := ctrl.sedeService.Update(c.Request.Context(), sede); err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, sede)
}

// Deactivate DELETE /api/v1/sedes/:id
func (ctrl *SedeController) Deactivate(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	sedeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		helper.ValidationError(c, "ID de sede inválido")
		return
	}

	if err := ctrl.sedeService.Deactivate(c.Request.Context(), tenantID, sedeID); err != nil {
		helper.Error(c, err)
		return
	}
	helper.NoContent(c)
}

// ── Helpers de mapeo ──

func (ctrl *SedeController) mapCreateToModel(tenantID uuid.UUID, req *dto.CreateSedeRequest) *model.Sede {
	sede := &model.Sede{
		TenantModel:       model.TenantModel{TenantID: tenantID},
		Nombre:            req.Nombre,
		Slug:              req.Slug,
		CodigoSede:        model.NullString{NullString: sql.NullString{String: req.CodigoSede, Valid: req.CodigoSede != ""}},
		Direccion:         req.Direccion,
		Departamento:      model.NullString{NullString: sql.NullString{String: req.Departamento, Valid: req.Departamento != ""}},
		Provincia:         model.NullString{NullString: sql.NullString{String: req.Provincia, Valid: req.Provincia != ""}},
		Distrito:          model.NullString{NullString: sql.NullString{String: req.Distrito, Valid: req.Distrito != ""}},
		Referencia:        model.NullString{NullString: sql.NullString{String: req.Referencia, Valid: req.Referencia != ""}},
		Telefono:          model.NullString{NullString: sql.NullString{String: req.Telefono, Valid: req.Telefono != ""}},
		Email:             model.NullString{NullString: sql.NullString{String: req.Email, Valid: req.Email != ""}},
		ResponsableNombre: model.NullString{NullString: sql.NullString{String: req.ResponsableNombre, Valid: req.ResponsableNombre != ""}},
		ResponsableCargo:  model.NullString{NullString: sql.NullString{String: req.ResponsableCargo, Valid: req.ResponsableCargo != ""}},
		EsPrincipal:       req.EsPrincipal,
	}

	// HorarioAtencion: JSONB → sql.NullString
	sede.HorarioAtencion = marshalHorario(req.HorarioAtencion)

	// Latitud / Longitud con punteros
	if req.Latitud != nil && *req.Latitud >= -90 && *req.Latitud <= 90 {
		sede.Latitud = model.NullFloat64{NullFloat64: sql.NullFloat64{Float64: *req.Latitud, Valid: true}}
	}
	if req.Longitud != nil && *req.Longitud >= -180 && *req.Longitud <= 180 {
		sede.Longitud = model.NullFloat64{NullFloat64: sql.NullFloat64{Float64: *req.Longitud, Valid: true}}
	}

	return sede
}

func (ctrl *SedeController) mapUpdateToModel(tenantID uuid.UUID, sedeID uuid.UUID, req *dto.UpdateSedeRequest) *model.Sede {
	sede := &model.Sede{
		TenantModel:       model.TenantModel{TenantID: tenantID},
		Nombre:            req.Nombre,
		Slug:              req.Slug,
		CodigoSede:        model.NullString{NullString: sql.NullString{String: req.CodigoSede, Valid: req.CodigoSede != ""}},
		Direccion:         req.Direccion,
		Departamento:      model.NullString{NullString: sql.NullString{String: req.Departamento, Valid: req.Departamento != ""}},
		Provincia:         model.NullString{NullString: sql.NullString{String: req.Provincia, Valid: req.Provincia != ""}},
		Distrito:          model.NullString{NullString: sql.NullString{String: req.Distrito, Valid: req.Distrito != ""}},
		Referencia:        model.NullString{NullString: sql.NullString{String: req.Referencia, Valid: req.Referencia != ""}},
		Telefono:          model.NullString{NullString: sql.NullString{String: req.Telefono, Valid: req.Telefono != ""}},
		Email:             model.NullString{NullString: sql.NullString{String: req.Email, Valid: req.Email != ""}},
		ResponsableNombre: model.NullString{NullString: sql.NullString{String: req.ResponsableNombre, Valid: req.ResponsableNombre != ""}},
		ResponsableCargo:  model.NullString{NullString: sql.NullString{String: req.ResponsableCargo, Valid: req.ResponsableCargo != ""}},
		EsPrincipal:       req.EsPrincipal,
	}
	sede.ID = sedeID

	sede.HorarioAtencion = marshalHorario(req.HorarioAtencion)

	if req.Latitud != nil && *req.Latitud >= -90 && *req.Latitud <= 90 {
		sede.Latitud = model.NullFloat64{NullFloat64: sql.NullFloat64{Float64: *req.Latitud, Valid: true}}
	}
	if req.Longitud != nil && *req.Longitud >= -180 && *req.Longitud <= 180 {
		sede.Longitud = model.NullFloat64{NullFloat64: sql.NullFloat64{Float64: *req.Longitud, Valid: true}}
	}

	return sede
}

// marshalHorario convierte []any a sql.NullString con JSON
func marshalHorario(horario []any) sql.NullString {
	if len(horario) == 0 {
		return sql.NullString{Valid: false}
	}
	b, err := json.Marshal(horario)
	if err != nil {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: string(b), Valid: true}
}
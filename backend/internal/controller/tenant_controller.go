package controller

import (
	"database/sql"
	"fmt"
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/service"

	"github.com/gin-gonic/gin"
)

type TenantController struct {
	tenantService *service.TenantService
}

func NewTenantController(tenantService *service.TenantService) *TenantController {
	return &TenantController{tenantService: tenantService}
}

// Get GET /api/v1/tenant
func (ctrl *TenantController) Get(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	tenant, err := ctrl.tenantService.GetByTenantID(c.Request.Context(), tenantID)
	if err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, tenant)
}

// updateTenantRequest define la estructura JSON esperada del frontend
type updateTenantRequest struct {
	RazonSocial         string `json:"razon_social" binding:"required"`
	RUC                 string `json:"ruc" binding:"required"`
	NombreComercial     string `json:"nombre_comercial"`
	DireccionLegal      string `json:"direccion_legal"`
	Departamento        string `json:"departamento"`
	Provincia           string `json:"provincia"`
	Distrito            string `json:"distrito"`
	Telefono            string `json:"telefono"`
	EmailContacto       string `json:"email_contacto"`
	SitioWeb            string `json:"sitio_web"`
	ColorPrimario       string `json:"color_primario"`
	PlazoRespuestaDias  int    `json:"plazo_respuesta_dias"`
	NotificarWhatsapp   bool   `json:"notificar_whatsapp"`
	NotificarEmail      bool   `json:"notificar_email"`
	LogoURL             string `json:"logo_url"`             // <--- Faltaba esto
	MensajeConfirmacion string `json:"mensaje_confirmacion"` // <--- Faltaba esto
	Version             int    `json:"version" binding:"required"`
}

// Update PUT /api/v1/tenant
func (ctrl *TenantController) Update(c *gin.Context) {
	tenantID, err := helper.GetTenantID(c)
	if err != nil {
		helper.Error(c, err)
		return
	}

	var req updateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helper.ValidationError(c, "razon_social, ruc y version son obligatorios")
		return
	}

	// DEBUG: Imprimir longitud del logo para verificar que llega
	if len(req.LogoURL) > 0 {
		fmt.Printf("[DEBUG] Recibiendo LogoURL (%d caracteres)\n", len(req.LogoURL))
	} else {
		fmt.Println("[DEBUG] LogoURL está vacío")
	}

	tenant := &model.Tenant{
		TenantModel:        model.TenantModel{TenantID: tenantID},
		RazonSocial:        req.RazonSocial,
		RUC:                req.RUC,
		NombreComercial:    model.NullString{NullString: sql.NullString{String: req.NombreComercial, Valid: req.NombreComercial != ""}},
		DireccionLegal:     model.NullString{NullString: sql.NullString{String: req.DireccionLegal, Valid: req.DireccionLegal != ""}},
		Departamento:       model.NullString{NullString: sql.NullString{String: req.Departamento, Valid: req.Departamento != ""}},
		Provincia:          model.NullString{NullString: sql.NullString{String: req.Provincia, Valid: req.Provincia != ""}},
		Distrito:           model.NullString{NullString: sql.NullString{String: req.Distrito, Valid: req.Distrito != ""}},
		Telefono:           model.NullString{NullString: sql.NullString{String: req.Telefono, Valid: req.Telefono != ""}},
		EmailContacto:      model.NullString{NullString: sql.NullString{String: req.EmailContacto, Valid: req.EmailContacto != ""}},
		SitioWeb:           model.NullString{NullString: sql.NullString{String: req.SitioWeb, Valid: req.SitioWeb != ""}},
		LogoURL:            model.NullString{NullString: sql.NullString{String: req.LogoURL, Valid: req.LogoURL != ""}}, // <--- Asignación corregida
		ColorPrimario:      req.ColorPrimario,
		PlazoRespuestaDias: req.PlazoRespuestaDias,
		MensajeConfirmacion: model.NullString{NullString: sql.NullString{String: req.MensajeConfirmacion, Valid: req.MensajeConfirmacion != ""}}, // <--- Asignación corregida
		NotificarWhatsapp:  req.NotificarWhatsapp,
		NotificarEmail:     req.NotificarEmail,
		Version:            req.Version,
	}

	if err := ctrl.tenantService.Update(c.Request.Context(), tenant); err != nil {
		helper.Error(c, err)
		return
	}
	helper.Success(c, gin.H{"message": "Configuración actualizada"})
}
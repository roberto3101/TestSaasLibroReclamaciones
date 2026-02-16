package controller

import (
    "libro-reclamaciones/internal/apperror"
    "libro-reclamaciones/internal/helper"
    "libro-reclamaciones/internal/model"
    "libro-reclamaciones/internal/model/dto"
    "libro-reclamaciones/internal/service"

    "github.com/gin-gonic/gin"
)

type PublicController struct {
    reclamoService   *service.ReclamoService
    tenantService    *service.TenantService
    sedeService      *service.SedeService
    mensajeService   *service.MensajeService
    respuestaService *service.RespuestaService
}

func NewPublicController(
    reclamoService *service.ReclamoService,
    tenantService *service.TenantService,
    sedeService *service.SedeService,
    mensajeService *service.MensajeService,
    respuestaService *service.RespuestaService,
) *PublicController {
    return &PublicController{
        reclamoService:   reclamoService,
        tenantService:    tenantService,
        sedeService:      sedeService,
        mensajeService:   mensajeService,
        respuestaService: respuestaService,
    }
}

// GetTenant GET /libro/:slug/tenant
func (ctrl *PublicController) GetTenant(c *gin.Context) {
	slug := c.Param("slug")
	tenant, err := ctrl.tenantService.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		helper.Error(c, err)
		return
	}

	response := dto.TenantPublicResponse{
		RazonSocial:     tenant.RazonSocial,
		RUC:             tenant.RUC,
		NombreComercial: tenant.NombreComercial.String,
		DireccionLegal:  tenant.DireccionLegal.String,
		LogoURL:         tenant.LogoURL.String,
		ColorPrimario:   tenant.ColorPrimario,
		Slug:            tenant.Slug,
	}

	helper.Success(c, response)
}

// GetSedes GET /libro/:slug/sedes
func (ctrl *PublicController) GetSedes(c *gin.Context) {
	slug := c.Param("slug")
	
	tenant, err := ctrl.tenantService.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		helper.Error(c, err)
		return
	}

	sedes, err := ctrl.sedeService.GetByTenant(c.Request.Context(), tenant.TenantID)
	if err != nil {
		helper.Error(c, err)
		return
	}

	// Asegurar que siempre devuelva un array (nunca null)
	if sedes == nil {
		sedes = []model.Sede{}
	}

	helper.Success(c, sedes)
}

// CrearReclamo POST /libro/:slug/reclamos
func (ctrl *PublicController) CrearReclamo(c *gin.Context) {
    slug := c.Param("slug")

    var req dto.CreateReclamoRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        helper.ValidationError(c, "Completa todos los campos obligatorios del formulario")
        return
    }

    reclamo, err := ctrl.reclamoService.CrearPublico(
        c.Request.Context(),
        slug,
        req,
        helper.GetClientIP(c),
        c.GetHeader("User-Agent"),
    )
    if err != nil {
        helper.Error(c, err)
        return
    }

    helper.Created(c, gin.H{
        "codigo_reclamo":         reclamo.CodigoReclamo,
        "fecha_registro":         reclamo.FechaRegistro,
        "fecha_limite_respuesta": reclamo.FechaLimiteRespuesta,
        "mensaje":                "Tu reclamo ha sido registrado exitosamente.",
    })
}

// ConsultarSeguimiento GET /libro/:slug/seguimiento/:codigo
func (ctrl *PublicController) ConsultarSeguimiento(c *gin.Context) {
    slug := c.Param("slug")
    codigo := c.Param("codigo")

    tenant, err := ctrl.tenantService.GetBySlug(c.Request.Context(), slug)
    if err != nil {
        helper.Error(c, err)
        return
    }

    reclamo, err := ctrl.reclamoService.GetByCodigoPublico(c.Request.Context(), tenant.TenantID, codigo)
    if err != nil {
        helper.Error(c, err)
        return
    }
   if reclamo == nil {
		helper.Error(c, apperror.New(404, "NOT_FOUND", "Reclamo no encontrado"))
		return
	}

    // Buscar respuesta oficial
    respuestas, _ := ctrl.respuestaService.GetByReclamo(c.Request.Context(), tenant.TenantID, reclamo.ID)
    var respuestaOficial string
    if len(respuestas) > 0 {
        respuestaOficial = respuestas[len(respuestas)-1].RespuestaEmpresa
    }

    response := dto.ReclamoTrackingResponse{
        CodigoReclamo:        reclamo.CodigoReclamo,
        Estado:               reclamo.Estado,
        FechaRegistro:        reclamo.FechaRegistro,
        FechaLimiteRespuesta: &reclamo.FechaLimiteRespuesta.Time,
        SedeNombre:           &reclamo.SedeNombre.String,
        TipoSolicitud:        reclamo.TipoSolicitud,
        DescripcionBien:      reclamo.DescripcionBien,
        RespuestaEmpresa:     respuestaOficial,
    }
    if reclamo.FechaRespuesta.Valid {
        response.FechaRespuesta = &reclamo.FechaRespuesta.Time
    }

    helper.Success(c, response)
}

// ListarMensajesPublico GET /libro/:slug/seguimiento/:codigo/mensajes
func (ctrl *PublicController) ListarMensajesPublico(c *gin.Context) {
    slug := c.Param("slug")
    codigo := c.Param("codigo")

    tenant, err := ctrl.tenantService.GetBySlug(c.Request.Context(), slug)
    if err != nil {
        helper.Error(c, err)
        return
    }

    reclamo, err := ctrl.reclamoService.GetByCodigoPublico(c.Request.Context(), tenant.TenantID, codigo)
    if err != nil || reclamo == nil {
        helper.Error(c, apperror.ErrNotFound)
        return
    }

    mensajes, err := ctrl.mensajeService.GetByReclamo(c.Request.Context(), tenant.TenantID, reclamo.ID)
    if err != nil {
        helper.Error(c, err)
        return
    }

    helper.Success(c, mensajes)
}

// EnviarMensajePublico POST /libro/:slug/seguimiento/:codigo/mensajes
func (ctrl *PublicController) EnviarMensajePublico(c *gin.Context) {
    slug := c.Param("slug")
    codigo := c.Param("codigo")
    var req dto.PublicMessageRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        helper.ValidationError(c, "Mensaje requerido")
        return
    }

    tenant, err := ctrl.tenantService.GetBySlug(c.Request.Context(), slug)
    if err != nil {
        helper.Error(c, err)
        return
    }

    reclamo, err := ctrl.reclamoService.GetByCodigoPublico(c.Request.Context(), tenant.TenantID, codigo)
    if err != nil || reclamo == nil {
        helper.Error(c, apperror.ErrNotFound)
        return
    }

    msg, err := ctrl.mensajeService.CrearPublico(c.Request.Context(), tenant.TenantID, reclamo.ID, req.Mensaje, req.ArchivoURL, req.ArchivoNombre)
    if err != nil {
        helper.Error(c, err)
        return
    }

    helper.Created(c, msg)
}
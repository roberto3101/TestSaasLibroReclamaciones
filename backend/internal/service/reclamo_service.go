package service

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"libro-reclamaciones/internal/apperror"
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/model/dto"
	"libro-reclamaciones/internal/repo"

	"github.com/google/uuid"
)

type ReclamoService struct {
	reclamoRepo   *repo.ReclamoRepo
	historialRepo *repo.HistorialRepo
	tenantRepo    *repo.TenantRepo
	sedeRepo      *repo.SedeRepo
	dashboardRepo *repo.DashboardRepo
	notifService  *NotificacionService
}

func NewReclamoService(
	reclamoRepo *repo.ReclamoRepo,
	historialRepo *repo.HistorialRepo,
	tenantRepo *repo.TenantRepo,
	sedeRepo *repo.SedeRepo,
	dashboardRepo *repo.DashboardRepo,
	notifService *NotificacionService,
) *ReclamoService {
	return &ReclamoService{
		reclamoRepo:   reclamoRepo,
		historialRepo: historialRepo,
		tenantRepo:    tenantRepo,
		sedeRepo:      sedeRepo,
		dashboardRepo: dashboardRepo,
		notifService:  notifService,
	}
}

func (s *ReclamoService) GetByTenant(ctx context.Context, tenantID uuid.UUID, pag dto.PaginationRequest) ([]model.Reclamo, int, error) {
	return s.reclamoRepo.GetByTenant(ctx, tenantID, pag)
}

func (s *ReclamoService) GetByCodigoPublico(ctx context.Context, tenantID uuid.UUID, codigo string) (*model.Reclamo, error) {
	return s.reclamoRepo.GetByCodigoPublico(ctx, tenantID, codigo)
}

func (s *ReclamoService) GetByID(ctx context.Context, tenantID, reclamoID uuid.UUID) (*model.Reclamo, error) {
	rec, err := s.reclamoRepo.GetByID(ctx, tenantID, reclamoID)
	if err != nil {
		return nil, fmt.Errorf("reclamo_service.GetByID: %w", err)
	}
	if rec == nil {
		return nil, apperror.ErrNotFound
	}
	return rec, nil
}

// CrearPublico crea un reclamo desde el formulario público (sin auth).
func (s *ReclamoService) CrearPublico(ctx context.Context, tenantSlug string, req dto.CreateReclamoRequest, ip, userAgent string) (*model.Reclamo, error) {
	// 1. Buscar tenant por slug
	tenant, err := s.tenantRepo.GetBySlug(ctx, tenantSlug)
	if err != nil {
		return nil, fmt.Errorf("reclamo_service.CrearPublico tenant: %w", err)
	}
	if tenant == nil || !tenant.Activo {
		return nil, apperror.ErrNotFound
	}

	// 2. Validar límite del plan
	uso, err := s.dashboardRepo.GetUsoTenant(ctx, tenant.TenantID)
	if err != nil {
		return nil, fmt.Errorf("reclamo_service.CrearPublico uso: %w", err)
	}
	if uso == nil {
		return nil, apperror.ErrSuscripcionInactiva
	}
	if !uso.CanCreateReclamo() {
		return nil, apperror.ErrPlanLimitReclamos.Withf(uso.LimiteReclamosMes)
	}

	// 3. Resolver sede
	var sede *model.Sede
	if req.SedeSlug != "" {
		sede, err = s.sedeRepo.GetBySlug(ctx, tenant.TenantID, req.SedeSlug)
		if err != nil {
			return nil, fmt.Errorf("reclamo_service.CrearPublico sede: %w", err)
		}
	}

	// 4. Generar código
	sedeSlug := ""
	if sede != nil {
		sedeSlug = sede.Slug
	}
	codigo := helper.GenerateCodigoReclamo(tenant.Slug, sedeSlug)

	// 5. Calcular fecha límite
	fechaIncidente, _ := time.Parse("2006-01-02", req.FechaIncidente)
	fechaLimite := helper.CalcularFechaLimite(time.Now(), tenant.PlazoRespuestaDias)

	// 6. Construir reclamo con snapshots
	reclamo := &model.Reclamo{
		TenantModel:   model.TenantModel{TenantID: tenant.TenantID},
		CodigoReclamo: codigo,
		TipoSolicitud: req.TipoSolicitud,
		Estado:        model.EstadoPendiente,

		NombreCompleto:  req.NombreCompleto,
		TipoDocumento:   req.TipoDocumento,
		NumeroDocumento: req.NumeroDocumento,
		Telefono:        req.Telefono,
		Email:           req.Email,
		Domicilio:       model.NullString{NullString: sql.NullString{String: req.Domicilio, Valid: req.Domicilio != ""}},
		Departamento:    model.NullString{NullString: sql.NullString{String: req.Departamento, Valid: req.Departamento != ""}},
		Provincia:       model.NullString{NullString: sql.NullString{String: req.Provincia, Valid: req.Provincia != ""}},
		Distrito:        model.NullString{NullString: sql.NullString{String: req.Distrito, Valid: req.Distrito != ""}},
		MenorDeEdad:     req.MenorDeEdad,
		NombreApoderado: model.NullString{NullString: sql.NullString{String: req.NombreApoderado, Valid: req.NombreApoderado != ""}},

		// Snapshot proveedor
		RazonSocialProveedor: model.NullString{NullString: sql.NullString{String: tenant.RazonSocial, Valid: true}},
		RUCProveedor:         model.NullString{NullString: sql.NullString{String: tenant.RUC, Valid: true}},
		DireccionProveedor:   model.NullString{NullString: sql.NullString{String: tenant.DireccionLegal.String, Valid: tenant.DireccionLegal.Valid}},

		TipoBien:        model.NullString{NullString: sql.NullString{String: req.TipoBien, Valid: req.TipoBien != ""}},
		MontoReclamado:  model.NullFloat64{Float64: req.MontoReclamado, Valid: req.MontoReclamado > 0},
		DescripcionBien: req.DescripcionBien,
		NumeroPedido:    model.NullString{NullString: sql.NullString{String: req.NumeroPedido, Valid: req.NumeroPedido != ""}},

		AreaQueja:            model.NullString{NullString: sql.NullString{String: req.AreaQueja, Valid: req.AreaQueja != ""}},
		DescripcionSituacion: model.NullString{NullString: sql.NullString{String: req.DescripcionSituacion, Valid: req.DescripcionSituacion != ""}},

		FechaIncidente:   fechaIncidente,
		DetalleReclamo:   req.DetalleReclamo,
		PedidoConsumidor: req.PedidoConsumidor,

		FirmaDigital: model.NullString{NullString: sql.NullString{String: req.FirmaDigital, Valid: req.FirmaDigital != ""}},
		IPAddress:    model.NullString{NullString: sql.NullString{String: ip, Valid: ip != ""}},
		UserAgent:    model.NullString{NullString: sql.NullString{String: userAgent, Valid: userAgent != ""}},

		FechaLimiteRespuesta: model.NullTime{NullTime: sql.NullTime{Time: fechaLimite, Valid: true}},
		CanalOrigen:          model.CanalWeb,
	}

	// Snapshot sede
	if sede != nil {
		reclamo.SedeID = model.NullUUID{UUID: sede.ID, Valid: true}
		reclamo.SedeNombre = model.NullString{NullString: sql.NullString{String: sede.Nombre, Valid: true}}
		reclamo.SedeDireccion = model.NullString{NullString: sql.NullString{String: sede.Direccion, Valid: true}}
	}

	// 7. Insertar reclamo
	if err := s.reclamoRepo.Create(ctx, reclamo); err != nil {
		return nil, fmt.Errorf("reclamo_service.CrearPublico create: %w", err)
	}

	// 8. Registrar historial
	historial := &model.Historial{
		TenantModel: model.TenantModel{TenantID: tenant.TenantID},
		ReclamoID:   reclamo.ID,
		EstadoNuevo: model.EstadoPendiente,
		TipoAccion:  model.AccionCreacion,
		IPAddress:   model.NullString{NullString: sql.NullString{String: ip, Valid: ip != ""}},
	}
	_ = s.historialRepo.Create(ctx, historial)

	// 9. Notificaciones por Email (Asíncrono)
	fechaFormateada := reclamo.FechaRegistro.Format("02/01/2006 15:04")

	// 9a. Confirmación al CLIENTE
	if tenant.NotificarEmail && reclamo.Email != "" {
		go func() {
			bgCtx := context.Background()
			_ = s.notifService.EnviarNotificacionReclamo(
				bgCtx,
				reclamo.Email,
				tenant,
				reclamo.CodigoReclamo,
				reclamo.NombreCompleto,
				fechaFormateada,
			)
		}()
	}

	// 9b. Notificación a la EMPRESA (email_contacto del tenant)
	if tenant.NotificarEmail && tenant.EmailContacto.Valid && tenant.EmailContacto.String != "" {
		go func() {
			bgCtx := context.Background()
			_ = s.notifService.EnviarNotificacionNuevoReclamoEmpresa(
				bgCtx,
				tenant.EmailContacto.String,
				tenant,
				reclamo.CodigoReclamo,
				reclamo.NombreCompleto,
				reclamo.TipoSolicitud,
				fechaFormateada,
			)
		}()
	}

	return reclamo, nil
}

func (s *ReclamoService) CambiarEstado(ctx context.Context, tenantID, reclamoID, userID uuid.UUID, nuevoEstado, comentario, ip string) error {
	reclamo, err := s.reclamoRepo.GetByID(ctx, tenantID, reclamoID)
	if err != nil {
		return fmt.Errorf("reclamo_service.CambiarEstado: %w", err)
	}
	if reclamo == nil {
		return apperror.ErrNotFound
	}

	estadoAnterior := reclamo.Estado

	if err := s.reclamoRepo.UpdateEstado(ctx, tenantID, reclamoID, nuevoEstado); err != nil {
		return fmt.Errorf("reclamo_service.CambiarEstado update: %w", err)
	}

	// Registrar historial
	historial := &model.Historial{
		TenantModel:    model.TenantModel{TenantID: tenantID},
		ReclamoID:      reclamoID,
		EstadoAnterior: model.NullString{NullString: sql.NullString{String: estadoAnterior, Valid: true}},
		EstadoNuevo:    nuevoEstado,
		TipoAccion:     model.AccionCambioEstado,
		Comentario:     model.NullString{NullString: sql.NullString{String: comentario, Valid: comentario != ""}},
		UsuarioAccion:  model.NullUUID{UUID: userID, Valid: true},
		IPAddress:      model.NullString{NullString: sql.NullString{String: ip, Valid: ip != ""}},
	}
	_ = s.historialRepo.Create(ctx, historial)

	// Notificar al cliente por email
	if reclamo.Email != "" {
		go func() {
			bgCtx := context.Background()

			t, errT := s.tenantRepo.GetByTenantID(bgCtx, tenantID)
			if errT != nil || t == nil {
				t = &model.Tenant{
					RazonSocial:   "Su Proveedor",
					ColorPrimario: "#1a56db",
					Slug:          "portal",
				}
			}

			// Limpiar estado para legibilidad: "EN_PROCESO" -> "EN PROCESO"
			estadoLegible := strings.ReplaceAll(nuevoEstado, "_", " ")

			errEnvio := s.notifService.EnviarNotificacionCambioEstado(
				bgCtx,
				reclamo.Email,
				t,
				reclamo.CodigoReclamo,
				reclamo.NombreCompleto,
				estadoLegible,
			)
			if errEnvio != nil {
				fmt.Printf("[ERROR SMTP CambiarEstado] %v\n", errEnvio)
			}
		}()
	}

	return nil
}

func (s *ReclamoService) Asignar(ctx context.Context, tenantID, reclamoID, adminID, userID uuid.UUID, ip string) error {
	reclamo, err := s.reclamoRepo.GetByID(ctx, tenantID, reclamoID)
	if err != nil {
		return fmt.Errorf("reclamo_service.Asignar: %w", err)
	}
	if reclamo == nil {
		return apperror.ErrNotFound
	}

	if err := s.reclamoRepo.Asignar(ctx, tenantID, reclamoID, adminID); err != nil {
		return fmt.Errorf("reclamo_service.Asignar: %w", err)
	}

	historial := &model.Historial{
		TenantModel:    model.TenantModel{TenantID: tenantID},
		ReclamoID:      reclamoID,
		EstadoAnterior: model.NullString{NullString: sql.NullString{String: reclamo.Estado, Valid: true}},
		EstadoNuevo:    reclamo.Estado,
		TipoAccion:     model.AccionAsignacion,
		Comentario:     model.NullString{NullString: sql.NullString{String: fmt.Sprintf("Asignado a %s", adminID), Valid: true}},
		UsuarioAccion:  model.NullUUID{UUID: userID, Valid: true},
		IPAddress:      model.NullString{NullString: sql.NullString{String: ip, Valid: ip != ""}},
	}
	_ = s.historialRepo.Create(ctx, historial)

	return nil
}

// nullStr helper inline para construir sql.NullString.
func nullStr(s string) sql.NullString {
	return sql.NullString{String: s, Valid: s != ""}
}
package service

import (
	"context"
	"database/sql"
	"fmt"

	"libro-reclamaciones/internal/apperror"
	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/repo"

	"github.com/google/uuid"
)

type SolicitudAsesorService struct {
	solicitudRepo      *repo.SolicitudAsesorRepo
	mensajeAtencionSvc *MensajeAtencionService
	canalWARepo        *repo.CanalWhatsAppRepo
	usuarioRepo        *repo.UsuarioRepo
}

func NewSolicitudAsesorService(
	solicitudRepo *repo.SolicitudAsesorRepo,
	mensajeAtencionSvc *MensajeAtencionService,
	canalWARepo *repo.CanalWhatsAppRepo,
	usuarioRepo *repo.UsuarioRepo,
) *SolicitudAsesorService {
	return &SolicitudAsesorService{
		solicitudRepo:      solicitudRepo,
		mensajeAtencionSvc: mensajeAtencionSvc,
		canalWARepo:        canalWARepo,
		usuarioRepo:        usuarioRepo,
	}
}

// ── Queries ─────────────────────────────────────────────────────────────────

// ListarAbiertas retorna solicitudes PENDIENTES y EN_ATENCION del tenant.
func (s *SolicitudAsesorService) ListarAbiertas(ctx context.Context, tenantID uuid.UUID) ([]model.SolicitudAsesor, error) {
	return s.solicitudRepo.ListarPendientesYEnAtencion(ctx, tenantID)
}

// ListarPorEstado retorna solicitudes filtradas por estado.
func (s *SolicitudAsesorService) ListarPorEstado(ctx context.Context, tenantID uuid.UUID, estado string, limite int) ([]model.SolicitudAsesor, error) {
	if limite <= 0 || limite > 100 {
		limite = 50
	}
	return s.solicitudRepo.ListarPorEstado(ctx, tenantID, estado, limite)
}

// ListarPorAsesor retorna solicitudes abiertas asignadas a un asesor.
func (s *SolicitudAsesorService) ListarPorAsesor(ctx context.Context, tenantID, asesorID uuid.UUID) ([]model.SolicitudAsesor, error) {
	return s.solicitudRepo.ListarPorAsesor(ctx, tenantID, asesorID)
}

// ContarPendientes retorna el total de solicitudes pendientes (badge sidebar).
func (s *SolicitudAsesorService) ContarPendientes(ctx context.Context, tenantID uuid.UUID) (int, error) {
	return s.solicitudRepo.ContarPendientes(ctx, tenantID)
}

// GetByID retorna una solicitud específica.
func (s *SolicitudAsesorService) GetByID(ctx context.Context, tenantID, solicitudID uuid.UUID) (*model.SolicitudAsesor, error) {
	sol, err := s.solicitudRepo.GetByID(ctx, tenantID, solicitudID)
	if err != nil {
		return nil, fmt.Errorf("solicitud_asesor_service.GetByID: %w", err)
	}
	if sol == nil {
		return nil, apperror.ErrNotFound
	}
	return sol, nil
}

// ── Comandos ────────────────────────────────────────────────────────────────

// CrearSolicitudParams agrupa los datos para crear una solicitud.
type CrearSolicitudParams struct {
	Nombre              string
	Telefono            string
	Motivo              string
	CanalOrigen         string
	CanalWhatsAppID     *uuid.UUID
	Prioridad           string
	ResumenConversacion string
}

// Crear registra una nueva solicitud de asesor.
// Valida que no exista una solicitud abierta para el mismo teléfono.
func (s *SolicitudAsesorService) Crear(ctx context.Context, tenantID uuid.UUID, params CrearSolicitudParams) (*model.SolicitudAsesor, error) {
	// Validar canal de origen
	canalOrigen := params.CanalOrigen
	if canalOrigen == "" {
		canalOrigen = model.CanalOrigenWeb
	}

	// Validar prioridad
	prioridad := params.Prioridad
	if prioridad == "" {
		prioridad = model.PrioridadNormal
	}

	// Rate limit: máximo 5 solicitudes abiertas por teléfono
	count, err := s.solicitudRepo.ContarAbiertasPorTelefono(ctx, tenantID, params.Telefono)
	if err != nil {
		return nil, fmt.Errorf("solicitud_asesor_service.Crear: %w", err)
	}
	if count >= 5 {
		return nil, apperror.New(429, "LIMITE_SOLICITUDES", "Has alcanzado el límite de solicitudes abiertas. Espera a que un asesor te atienda.")
	}

	sol := &model.SolicitudAsesor{
		TenantModel: model.TenantModel{TenantID: tenantID},
		Nombre:      params.Nombre,
		Telefono:    params.Telefono,
		Motivo:      params.Motivo,
		CanalOrigen: canalOrigen,
		Prioridad:   prioridad,
		ResumenConversacion: model.NullString{NullString: sql.NullString{
			String: params.ResumenConversacion,
			Valid:  params.ResumenConversacion != "",
		}},
	}

	if params.CanalWhatsAppID != nil {
		sol.CanalWhatsAppID = model.NullUUID{UUID: *params.CanalWhatsAppID, Valid: true}
	}

	if err := s.solicitudRepo.Crear(ctx, sol); err != nil {
		return nil, fmt.Errorf("solicitud_asesor_service.Crear: %w", err)
	}

	return sol, nil
}

// Asignar asigna un asesor a la solicitud y cambia estado a EN_ATENCION.
// Envía mensaje de handoff al cliente por WhatsApp.
func (s *SolicitudAsesorService) Asignar(ctx context.Context, tenantID, solicitudID, asesorID uuid.UUID) error {
	sol, err := s.solicitudRepo.GetByID(ctx, tenantID, solicitudID)
	if err != nil {
		return fmt.Errorf("solicitud_asesor_service.Asignar: %w", err)
	}
	if sol == nil {
		return apperror.ErrNotFound
	}
	if !sol.EstaAbierta() {
		return apperror.New(400, "SOLICITUD_CERRADA", "No se puede asignar una solicitud que ya fue resuelta o cancelada")
	}

	esPrimeraAsignacion := sol.Estado == model.SolicitudPendiente

	if err := s.solicitudRepo.AsignarAsesor(ctx, tenantID, solicitudID, asesorID); err != nil {
		return err
	}

	// Obtener nombre del asesor para el mensaje
	nombreAsesor := "un asesor"
	if asesor, errU := s.usuarioRepo.GetByID(ctx, tenantID, asesorID); errU == nil && asesor != nil {
		nombreAsesor = asesor.NombreCompleto
	}

	// Mensaje de handoff
	var textoHandoff string
	if esPrimeraAsignacion {
		textoHandoff = fmt.Sprintf("✅ A partir de ahora te atenderá *%s*. Puedes escribir tu consulta por aquí. 😊", nombreAsesor)
	} else {
		textoHandoff = fmt.Sprintf("🔄 Tu atención ha sido transferida a *%s*. Puedes continuar tu consulta por aquí.", nombreAsesor)
	}

	s.enviarMensajeSistema(ctx, tenantID, sol, textoHandoff)
	return nil
}

// Resolver marca la solicitud como resuelta con nota interna opcional.
// Envía mensaje de cierre al cliente y reactiva el bot.
func (s *SolicitudAsesorService) Resolver(ctx context.Context, tenantID, solicitudID uuid.UUID, notaInterna string) error {
	sol, err := s.solicitudRepo.GetByID(ctx, tenantID, solicitudID)
	if err != nil {
		return fmt.Errorf("solicitud_asesor_service.Resolver: %w", err)
	}
	if sol == nil {
		return apperror.ErrNotFound
	}
	if !sol.EstaAbierta() {
		return apperror.New(400, "SOLICITUD_CERRADA", "La solicitud ya fue resuelta o cancelada")
	}

	if err := s.solicitudRepo.MarcarComoResuelta(ctx, tenantID, solicitudID, notaInterna); err != nil {
		return err
	}

	textoResuelta := "✅ Tu consulta ha sido resuelta. ¡Gracias por comunicarte con nosotros!\n\nSi necesitas algo más, escríbenos nuevamente. 😊"
	s.enviarMensajeSistema(ctx, tenantID, sol, textoResuelta)
	return nil
}

// Cancelar marca la solicitud como cancelada.
func (s *SolicitudAsesorService) Cancelar(ctx context.Context, tenantID, solicitudID uuid.UUID) error {
	sol, err := s.solicitudRepo.GetByID(ctx, tenantID, solicitudID)
	if err != nil {
		return fmt.Errorf("solicitud_asesor_service.Cancelar: %w", err)
	}
	if sol == nil {
		return apperror.ErrNotFound
	}
	if !sol.EstaAbierta() {
		return apperror.New(400, "SOLICITUD_CERRADA", "La solicitud ya fue resuelta o cancelada")
	}

	if err := s.solicitudRepo.Cancelar(ctx, tenantID, solicitudID); err != nil {
		return err
	}

	textoCancelada := "Tu solicitud de atención ha sido cancelada. Si necesitas ayuda nuevamente, no dudes en escribirnos. 😊"
	s.enviarMensajeSistema(ctx, tenantID, sol, textoCancelada)
	return nil
}

// ActualizarPrioridad cambia la prioridad de una solicitud abierta.
func (s *SolicitudAsesorService) ActualizarPrioridad(ctx context.Context, tenantID, solicitudID uuid.UUID, prioridad string) error {
	return s.solicitudRepo.ActualizarPrioridad(ctx, tenantID, solicitudID, prioridad)
}

// ActualizarNotaInterna edita la nota interna de una solicitud.
func (s *SolicitudAsesorService) ActualizarNotaInterna(ctx context.Context, tenantID, solicitudID uuid.UUID, nota string) error {
	return s.solicitudRepo.ActualizarNotaInterna(ctx, tenantID, solicitudID, nota)
}

// enviarMensajeSistema guarda un mensaje SISTEMA en el historial y lo envía por WhatsApp.
func (s *SolicitudAsesorService) enviarMensajeSistema(ctx context.Context, tenantID uuid.UUID, sol *model.SolicitudAsesor, texto string) {
	// Guardar en tabla mensajes_atencion
	if s.mensajeAtencionSvc != nil {
		_ = s.mensajeAtencionSvc.GuardarMensajeSistema(ctx, tenantID, sol.ID, texto)
	}

	// Enviar por WhatsApp si tiene canal vinculado
	if sol.CanalWhatsAppID.Valid && s.canalWARepo != nil {
		go func() {
			canal, err := s.canalWARepo.GetByID(context.Background(), tenantID, sol.CanalWhatsAppID.UUID)
			if err != nil || canal == nil {
				fmt.Printf("[Handoff] Error obteniendo canal WA: %v\n", err)
				return
			}
			if err := EnviarMensajeWhatsApp(context.Background(), canal.AccessToken, canal.PhoneNumberID, sol.Telefono, texto); err != nil {
				fmt.Printf("[Handoff] Error enviando WA a %s: %v\n", sol.Telefono, err)
			} else {
				fmt.Printf("[Handoff] ✅ Mensaje sistema → %s\n", sol.Telefono)
			}
		}()
	}
}

// BuscarActivaPorTelefono retorna la solicitud EN_ATENCION de un teléfono (si existe).
func (s *SolicitudAsesorService) BuscarActivaPorTelefono(ctx context.Context, tenantID uuid.UUID, telefono string) (*model.SolicitudAsesor, error) {
	return s.solicitudRepo.BuscarActivaPorTelefono(ctx, tenantID, telefono)
}
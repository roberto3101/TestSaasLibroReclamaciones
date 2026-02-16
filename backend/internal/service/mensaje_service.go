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

type MensajeService struct {
	mensajeRepo  *repo.MensajeRepo
	reclamoRepo  *repo.ReclamoRepo
	tenantRepo   *repo.TenantRepo
	notifService *NotificacionService
}

func NewMensajeService(mensajeRepo *repo.MensajeRepo, reclamoRepo *repo.ReclamoRepo, tenantRepo *repo.TenantRepo, notifService *NotificacionService) *MensajeService {
	return &MensajeService{
		mensajeRepo:  mensajeRepo,
		reclamoRepo:  reclamoRepo,
		tenantRepo:   tenantRepo,
		notifService: notifService,
	}
}

func (s *MensajeService) GetByReclamo(ctx context.Context, tenantID, reclamoID uuid.UUID) ([]model.Mensaje, error) {
	return s.mensajeRepo.GetByReclamo(ctx, tenantID, reclamoID)
}

func (s *MensajeService) Crear(ctx context.Context, tenantID, reclamoID uuid.UUID, tipoMensaje, texto, archivoURL, archivoNombre string) (*model.Mensaje, error) {
	// Verificar que el reclamo existe
	reclamo, err := s.reclamoRepo.GetByID(ctx, tenantID, reclamoID)
	if err != nil {
		return nil, fmt.Errorf("mensaje_service.Crear: %w", err)
	}
	if reclamo == nil {
		return nil, apperror.ErrNotFound
	}

	msg := &model.Mensaje{
		TenantModel:   model.TenantModel{TenantID: tenantID},
		ReclamoID:     reclamoID,
		TipoMensaje:   tipoMensaje,
		MensajeTexto:  texto,
		ArchivoURL:    model.NullString{NullString: sql.NullString{String: archivoURL, Valid: archivoURL != ""}},
		ArchivoNombre: model.NullString{NullString: sql.NullString{String: archivoNombre, Valid: archivoNombre != ""}},
	}

	if err := s.mensajeRepo.Create(ctx, msg); err != nil {
		return nil, fmt.Errorf("mensaje_service.Crear: %w", err)
	}

	// Notificar al cliente si el mensaje es de la EMPRESA/ADMIN
	if tipoMensaje != "CLIENTE" && reclamo.Email != "" {
		go func() {
			bgCtx := context.Background()
			t, _ := s.tenantRepo.GetByTenantID(bgCtx, tenantID)

			// Fail-safe
			if t == nil {
				t = &model.Tenant{RazonSocial: "Soporte", ColorPrimario: "#1a56db", Slug: "portal"}
			}

			errEnvio := s.notifService.EnviarNotificacionMensajeNuevo(
				bgCtx,
				reclamo.Email,
				t,
				reclamo.CodigoReclamo,
				reclamo.NombreCompleto,
				texto,
			)
			if errEnvio != nil {
				fmt.Printf("[ERROR SMTP Mensaje] %v\n", errEnvio)
			}
		}()
	}

	return msg, nil
}

func (s *MensajeService) CrearPublico(ctx context.Context, tenantID, reclamoID uuid.UUID, texto, archivoURL, archivoNombre string) (*model.Mensaje, error) {
	reclamo, err := s.reclamoRepo.GetByID(ctx, tenantID, reclamoID)
	if err != nil {
		return nil, fmt.Errorf("mensaje_service.CrearPublico: %w", err)
	}
	if reclamo == nil {
		return nil, apperror.ErrNotFound
	}

	msg := &model.Mensaje{
		TenantModel:   model.TenantModel{TenantID: tenantID},
		ReclamoID:     reclamoID,
		TipoMensaje:   "CLIENTE",
		MensajeTexto:  texto,
		ArchivoURL:    model.NullString{NullString: sql.NullString{String: archivoURL, Valid: archivoURL != ""}},
		ArchivoNombre: model.NullString{NullString: sql.NullString{String: archivoNombre, Valid: archivoNombre != ""}},
	}

	if err := s.mensajeRepo.Create(ctx, msg); err != nil {
		return nil, fmt.Errorf("mensaje_service.CrearPublico: %w", err)
	}
	return msg, nil
}

func (s *MensajeService) MarcarLeidos(ctx context.Context, tenantID, reclamoID uuid.UUID, tipo string) error {
	reclamo, err := s.reclamoRepo.GetByID(ctx, tenantID, reclamoID)
	if err != nil {
		return fmt.Errorf("mensaje_service.MarcarLeidos: %w", err)
	}
	if reclamo == nil {
		return apperror.ErrNotFound
	}
	return s.mensajeRepo.MarkAsRead(ctx, tenantID, reclamoID, tipo)
}
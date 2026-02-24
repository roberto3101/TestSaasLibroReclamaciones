package service

import (
	"context"
	"fmt"

	"libro-reclamaciones/internal/apperror"
	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/repo"

	"github.com/google/uuid"
)

type MensajeAtencionService struct {
	mensajeRepo  *repo.MensajeAtencionRepo
	solicitudRepo *repo.SolicitudAsesorRepo
	canalWARepo  *repo.CanalWhatsAppRepo
}

func NewMensajeAtencionService(
	mensajeRepo *repo.MensajeAtencionRepo,
	solicitudRepo *repo.SolicitudAsesorRepo,
	canalWARepo *repo.CanalWhatsAppRepo,
) *MensajeAtencionService {
	return &MensajeAtencionService{
		mensajeRepo:   mensajeRepo,
		solicitudRepo: solicitudRepo,
		canalWARepo:   canalWARepo,
	}
}

// ListarMensajes retorna los mensajes de una solicitud.
func (s *MensajeAtencionService) ListarMensajes(ctx context.Context, tenantID, solicitudID uuid.UUID) ([]model.MensajeAtencion, error) {
	return s.mensajeRepo.ListarPorSolicitud(ctx, tenantID, solicitudID)
}

// EnviarComoAsesor guarda el mensaje y lo envía por WhatsApp.
func (s *MensajeAtencionService) EnviarComoAsesor(ctx context.Context, tenantID, solicitudID, asesorID uuid.UUID, contenido string) (*model.MensajeAtencion, error) {
	// Validar que la solicitud existe y está en atención
	sol, err := s.solicitudRepo.GetByID(ctx, tenantID, solicitudID)
	if err != nil {
		return nil, fmt.Errorf("mensaje_atencion_service.EnviarComoAsesor: %w", err)
	}
	if sol == nil {
		return nil, apperror.ErrNotFound
	}
	if !sol.EstaAbierta() {
		return nil, apperror.New(400, "SOLICITUD_CERRADA", "No se pueden enviar mensajes a una solicitud cerrada")
	}

	// Guardar en BD
	msg := &model.MensajeAtencion{
		TenantID:    tenantID,
		SolicitudID: solicitudID,
		Remitente:   model.RemitentAsesor,
		Contenido:   contenido,
		AsesorID:    model.NullUUID{UUID: asesorID, Valid: true},
	}

	if err := s.mensajeRepo.Crear(ctx, msg); err != nil {
		return nil, fmt.Errorf("mensaje_atencion_service.EnviarComoAsesor guardar: %w", err)
	}

	// Enviar por WhatsApp (si tiene canal vinculado)
	if sol.CanalWhatsAppID.Valid {
		go func() {
			canal, errC := s.canalWARepo.GetByID(ctx, tenantID, sol.CanalWhatsAppID.UUID)
			if errC != nil || canal == nil {
				fmt.Printf("[Chat] Error obteniendo canal WA: %v\n", errC)
				return
			}
			errSend := EnviarMensajeWhatsApp(ctx, canal.AccessToken, canal.PhoneNumberID, sol.Telefono, contenido)
			if errSend != nil {
				fmt.Printf("[Chat] Error enviando WA a %s: %v\n", sol.Telefono, errSend)
			} else {
				fmt.Printf("[Chat] ✅ Mensaje asesor → %s enviado por WA\n", sol.Telefono)
			}
		}()
	}

	return msg, nil
}

// GuardarMensajeCliente guarda un mensaje entrante del cliente (llamado desde whatsapp_service).
func (s *MensajeAtencionService) GuardarMensajeCliente(ctx context.Context, tenantID, solicitudID uuid.UUID, contenido string) error {
	msg := &model.MensajeAtencion{
		TenantID:    tenantID,
		SolicitudID: solicitudID,
		Remitente:   model.RemitentCliente,
		Contenido:   contenido,
	}
	return s.mensajeRepo.Crear(ctx, msg)
}

// GuardarMensajeSistema guarda un mensaje automático (handoff, transferencia, cierre).
func (s *MensajeAtencionService) GuardarMensajeSistema(ctx context.Context, tenantID, solicitudID uuid.UUID, contenido string) error {
	msg := &model.MensajeAtencion{
		TenantID:    tenantID,
		SolicitudID: solicitudID,
		Remitente:   model.RemitentSistema,
		Contenido:   contenido,
	}
	return s.mensajeRepo.Crear(ctx, msg)
}
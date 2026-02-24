package service

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"libro-reclamaciones/internal/apperror"
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/repo"

	"github.com/google/uuid"
)

type ChatbotService struct {
	chatbotRepo   *repo.ChatbotRepo
	apiKeyRepo    *repo.ChatbotAPIKeyRepo
	dashboardRepo *repo.DashboardRepo
	apiKeyPrefix  string
}

func NewChatbotService(chatbotRepo *repo.ChatbotRepo, apiKeyRepo *repo.ChatbotAPIKeyRepo, dashboardRepo *repo.DashboardRepo, apiKeyPrefix string) *ChatbotService {
	return &ChatbotService{
		chatbotRepo:   chatbotRepo,
		apiKeyRepo:    apiKeyRepo,
		dashboardRepo: dashboardRepo,
		apiKeyPrefix:  apiKeyPrefix,
	}
}

func (s *ChatbotService) GetByTenant(ctx context.Context, tenantID uuid.UUID) ([]model.Chatbot, error) {
	return s.chatbotRepo.GetByTenant(ctx, tenantID)
}

func (s *ChatbotService) GetByID(ctx context.Context, tenantID, chatbotID uuid.UUID) (*model.Chatbot, error) {
	c, err := s.chatbotRepo.GetByID(ctx, tenantID, chatbotID)
	if err != nil {
		return nil, fmt.Errorf("chatbot_service.GetByID: %w", err)
	}
	if c == nil {
		return nil, apperror.ErrNotFound
	}
	return c, nil
}

func (s *ChatbotService) Create(ctx context.Context, tenantID uuid.UUID, params CreateChatbotParams) (*model.Chatbot, error) {
	uso, err := s.dashboardRepo.GetUsoTenant(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("chatbot_service.Create: %w", err)
	}
	if uso == nil {
		return nil, apperror.ErrSuscripcionInactiva
	}
	if !uso.PermiteChatbot {
		return nil, apperror.ErrPlanSinChatbot
	}
	if !uso.CanCreateChatbot() {
		return nil, apperror.ErrPlanLimitChatbots.Withf(uso.LimiteChatbots)
	}

	chatbot := &model.Chatbot{
		TenantModel: model.TenantModel{TenantID: tenantID},
		Nombre:      params.Nombre,
		Tipo:        params.Tipo,
		Descripcion: model.NullString{NullString: sql.NullString{String: params.Descripcion, Valid: params.Descripcion != ""}},
		// Config IA
		ModeloIA:           model.NullString{NullString: sql.NullString{String: params.ModeloIA, Valid: params.ModeloIA != ""}},
		PromptSistema:      model.NullString{NullString: sql.NullString{String: params.PromptSistema, Valid: params.PromptSistema != ""}},
		Temperatura:        model.NullFloat64{NullFloat64: sql.NullFloat64{Float64: params.Temperatura, Valid: params.Temperatura > 0}},
		MaxTokensRespuesta: model.NullInt64{NullInt64: sql.NullInt64{Int64: int64(params.MaxTokensRespuesta), Valid: params.MaxTokensRespuesta > 0}},
		// Meta
		CreadoPor: model.NullUUID{UUID: params.CreadoPor, Valid: params.CreadoPor != uuid.Nil},
	}

	if err := s.chatbotRepo.Create(ctx, chatbot); err != nil {
		return nil, fmt.Errorf("chatbot_service.Create: %w", err)
	}
	return chatbot, nil
}

// CreateChatbotParams agrupa los datos para crear un chatbot.
type CreateChatbotParams struct {
	Nombre             string
	Tipo               string
	Descripcion        string
	ModeloIA           string
	PromptSistema      string
	Temperatura        float64
	MaxTokensRespuesta int
	CreadoPor          uuid.UUID
}

// UpdateChatbotParams agrupa todos los campos editables del chatbot.
type UpdateChatbotParams struct {
	Nombre              string
	Tipo                string
	Descripcion         string
	Activo              bool
	// Config IA
	ModeloIA            string
	PromptSistema       string
	Temperatura         float64
	MaxTokensRespuesta  int
	// Scopes
	PuedeLeerReclamos   bool
	PuedeResponder      bool
	PuedeCambiarEstado  bool
	PuedeEnviarMensajes bool
	PuedeLeerMetricas   bool
	RequiereAprobacion  bool
}

func (s *ChatbotService) Update(ctx context.Context, tenantID, chatbotID uuid.UUID, params UpdateChatbotParams) error {
	existing, err := s.chatbotRepo.GetByID(ctx, tenantID, chatbotID)
	if err != nil {
		return fmt.Errorf("chatbot_service.Update: %w", err)
	}
	if existing == nil {
		return apperror.ErrNotFound
	}

	existing.Nombre = params.Nombre
	existing.Tipo = params.Tipo
	existing.Descripcion = model.NullString{NullString: sql.NullString{String: params.Descripcion, Valid: params.Descripcion != ""}}
	existing.Activo = params.Activo
	// Config IA
	existing.ModeloIA = model.NullString{NullString: sql.NullString{String: params.ModeloIA, Valid: params.ModeloIA != ""}}
	existing.PromptSistema = model.NullString{NullString: sql.NullString{String: params.PromptSistema, Valid: params.PromptSistema != ""}}
	existing.Temperatura = model.NullFloat64{NullFloat64: sql.NullFloat64{Float64: params.Temperatura, Valid: params.Temperatura > 0}}
	existing.MaxTokensRespuesta = model.NullInt64{NullInt64: sql.NullInt64{Int64: int64(params.MaxTokensRespuesta), Valid: params.MaxTokensRespuesta > 0}}
	// Scopes
	existing.PuedeLeerReclamos = params.PuedeLeerReclamos
	existing.PuedeResponder = params.PuedeResponder
	existing.PuedeCambiarEstado = params.PuedeCambiarEstado
	existing.PuedeEnviarMensajes = params.PuedeEnviarMensajes
	existing.PuedeLeerMetricas = params.PuedeLeerMetricas
	existing.RequiereAprobacion = params.RequiereAprobacion

	return s.chatbotRepo.Update(ctx, existing)
}

// Deactivate desactiva un chatbot Y revoca todas sus API keys (seguridad).
func (s *ChatbotService) Deactivate(ctx context.Context, tenantID, chatbotID uuid.UUID) error {
	existing, err := s.chatbotRepo.GetByID(ctx, tenantID, chatbotID)
	if err != nil {
		return fmt.Errorf("chatbot_service.Deactivate: %w", err)
	}
	if existing == nil {
		return apperror.ErrNotFound
	}
	return s.chatbotRepo.SoftDelete(ctx, tenantID, chatbotID)
}

// Reactivate reactiva un chatbot previamente desactivado.
func (s *ChatbotService) Reactivate(ctx context.Context, tenantID, chatbotID uuid.UUID) error {
	existing, err := s.chatbotRepo.GetByID(ctx, tenantID, chatbotID)
	if err != nil {
		return fmt.Errorf("chatbot_service.Reactivate: %w", err)
	}
	if existing == nil {
		return apperror.ErrNotFound
	}
	if existing.Activo {
		return nil
	}
	return s.chatbotRepo.Reactivate(ctx, tenantID, chatbotID)
}

// Delete eliminación lógica completa.
func (s *ChatbotService) Delete(ctx context.Context, tenantID, chatbotID uuid.UUID) error {
	existing, err := s.chatbotRepo.GetByID(ctx, tenantID, chatbotID)
	if err != nil {
		return fmt.Errorf("chatbot_service.Delete: %w", err)
	}
	if existing == nil {
		return apperror.ErrNotFound
	}
	return s.chatbotRepo.SoftDelete(ctx, tenantID, chatbotID)
}

// --- API Key Management ---

func (s *ChatbotService) GetAPIKeys(ctx context.Context, tenantID, chatbotID uuid.UUID) ([]model.APIKey, error) {
	return s.apiKeyRepo.GetByChatbot(ctx, tenantID, chatbotID)
}

func (s *ChatbotService) GenerateAPIKey(ctx context.Context, tenantID, chatbotID uuid.UUID, nombre, entorno string, creadoPor uuid.UUID) (*model.APIKey, string, error) {
	existing, err := s.chatbotRepo.GetByID(ctx, tenantID, chatbotID)
	if err != nil {
		return nil, "", fmt.Errorf("chatbot_service.GenerateAPIKey: %w", err)
	}
	if existing == nil {
		return nil, "", apperror.ErrNotFound
	}
	if !existing.Activo {
		return nil, "", apperror.New(400, "CHATBOT_INACTIVO", "No se pueden generar keys para un chatbot inactivo")
	}

	plainKey, keyPrefix, err := helper.GenerateAPIKey(s.apiKeyPrefix, entorno)
	if err != nil {
		return nil, "", fmt.Errorf("chatbot_service.GenerateAPIKey (crypto): %w", err)
	}

	keyHash := helper.SHA256Hash(plainKey)

	key := &model.APIKey{
		TenantModel:     model.TenantModel{TenantID: tenantID},
		ChatbotID:       chatbotID,
		Nombre:          nombre,
		KeyHash:         keyHash,
		KeyPrefix:       keyPrefix,
		Entorno:         entorno,
		Activa:          true,
		FechaExpiracion: model.NullTime{NullTime: sql.NullTime{Time: time.Now().AddDate(1, 0, 0), Valid: true}},
		CreadoPor:       model.NullUUID{UUID: creadoPor, Valid: creadoPor != uuid.Nil},
	}

	if err := s.apiKeyRepo.Create(ctx, key); err != nil {
		return nil, "", fmt.Errorf("chatbot_service.GenerateAPIKey (db): %w", err)
	}

	return key, plainKey, nil
}

func (s *ChatbotService) RevokeAPIKey(ctx context.Context, tenantID, keyID uuid.UUID) error {
	return s.apiKeyRepo.Revoke(ctx, tenantID, keyID)
}
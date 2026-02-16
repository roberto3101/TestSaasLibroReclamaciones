package service

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"libro-reclamaciones/internal/apperror"
	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/repo"

	"github.com/google/uuid"
)

type SuscripcionService struct {
	suscripcionRepo *repo.SuscripcionRepo
	planRepo        *repo.PlanRepo
}

func NewSuscripcionService(suscripcionRepo *repo.SuscripcionRepo, planRepo *repo.PlanRepo) *SuscripcionService {
	return &SuscripcionService{
		suscripcionRepo: suscripcionRepo,
		planRepo:        planRepo,
	}
}

func (s *SuscripcionService) GetActiva(ctx context.Context, tenantID uuid.UUID) (*model.Suscripcion, error) {
	sus, err := s.suscripcionRepo.GetActiva(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("suscripcion_service.GetActiva: %w", err)
	}
	if sus == nil {
		return nil, apperror.ErrSuscripcionInactiva
	}
	return sus, nil
}

func (s *SuscripcionService) GetHistorial(ctx context.Context, tenantID uuid.UUID) ([]model.Suscripcion, error) {
	return s.suscripcionRepo.GetHistorial(ctx, tenantID)
}

// CambiarPlan cancela la suscripciÃ³n actual y crea una nueva con el plan indicado.
func (s *SuscripcionService) CambiarPlan(ctx context.Context, tenantID uuid.UUID, nuevoPlanCodigo, ciclo, referenciaPago, metodoPago, activadoPor string) (*model.Suscripcion, error) {
	plan, err := s.planRepo.GetByCodigo(ctx, nuevoPlanCodigo)
	if err != nil {
		return nil, fmt.Errorf("suscripcion_service.CambiarPlan: %w", err)
	}
	if plan == nil {
		return nil, apperror.ErrNotFound
	}

	// Cancelar suscripciÃ³n actual
	if err := s.suscripcionRepo.CancelActiva(ctx, tenantID); err != nil {
		return nil, fmt.Errorf("suscripcion_service.CambiarPlan cancel: %w", err)
	}

	// Calcular prÃ³ximo cobro
	var proximoCobro time.Time
	switch ciclo {
	case model.CicloAnual:
		proximoCobro = time.Now().AddDate(1, 0, 0)
	default:
		ciclo = model.CicloMensual
		proximoCobro = time.Now().AddDate(0, 1, 0)
	}

	nueva := &model.Suscripcion{
		TenantModel: model.TenantModel{TenantID: tenantID},
		PlanID:      plan.ID,
		Estado:      model.SuscripcionActiva,
		Ciclo:       ciclo,
		FechaInicio: time.Now(),
		FechaProximoCobro: model.NullTime{NullTime: sql.NullTime{Time: proximoCobro, Valid: true}},
		ReferenciaPago: model.NullString{NullString: sql.NullString{String: referenciaPago, Valid: referenciaPago != ""}},
		MetodoPago:     model.NullString{NullString: sql.NullString{String: metodoPago, Valid: metodoPago != ""}},
		ActivadoPor:    model.NullString{NullString: sql.NullString{String: activadoPor, Valid: true}},
	}

	if err := s.suscripcionRepo.Create(ctx, nueva); err != nil {
		return nil, fmt.Errorf("suscripcion_service.CambiarPlan create: %w", err)
	}

	return nueva, nil
}

// CrearTrial crea una suscripciÃ³n DEMO trial para un nuevo tenant.
func (s *SuscripcionService) CrearTrial(ctx context.Context, tenantID uuid.UUID, planDemo *model.Plan, diasTrial int) (*model.Suscripcion, error) {
	finTrial := time.Now().AddDate(0, 0, diasTrial)

	nueva := &model.Suscripcion{
		TenantModel: model.TenantModel{TenantID: tenantID},
		PlanID:      planDemo.ID,
		Estado:      model.SuscripcionTrial,
		Ciclo:       model.CicloMensual,
		FechaInicio: time.Now(),
		EsTrial:     true,
		DiasTrial:   diasTrial,
		FechaFinTrial: model.NullTime{NullTime: sql.NullTime{Time: finTrial, Valid: true}},
		ActivadoPor: model.NullString{NullString: sql.NullString{String: model.ActivadoPorOnboarding, Valid: true}},
	}

	if err := s.suscripcionRepo.Create(ctx, nueva); err != nil {
		return nil, fmt.Errorf("suscripcion_service.CrearTrial: %w", err)
	}
	return nueva, nil
}

// NullTimeFrom helper para crear sql.NullTime.
func NullTimeFrom(t time.Time) sql.NullTime {
	return sql.NullTime{Time: t, Valid: true}
}


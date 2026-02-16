package service

import (
	"context"
	"fmt"

	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/repo"

	"github.com/google/uuid"
)

const defaultTrialDays = 15

type OnboardingService struct {
	tenantRepo      *repo.TenantRepo
	sedeRepo        *repo.SedeRepo
	planRepo        *repo.PlanRepo
	suscripcionRepo *repo.SuscripcionRepo
}

func NewOnboardingService(
	tenantRepo *repo.TenantRepo,
	sedeRepo *repo.SedeRepo,
	planRepo *repo.PlanRepo,
	suscripcionRepo *repo.SuscripcionRepo,
) *OnboardingService {
	return &OnboardingService{
		tenantRepo:      tenantRepo,
		sedeRepo:        sedeRepo,
		planRepo:        planRepo,
		suscripcionRepo: suscripcionRepo,
	}
}

// OnboardingResult resultado del onboarding completo.
type OnboardingResult struct {
	Tenant      *model.Tenant
	Sede        *model.Sede
	Suscripcion *model.Suscripcion
}

// Registrar crea tenant + sede principal + suscripción DEMO trial.
// TODO: envolver en transacción cuando se implemente el tx helper.
func (s *OnboardingService) Registrar(ctx context.Context, tenantID uuid.UUID, razonSocial, ruc, slug, direccion string) (*OnboardingResult, error) {
	// 1. Crear configuración del tenant
	tenant := &model.Tenant{
		TenantModel: model.TenantModel{TenantID: tenantID},
		RazonSocial: razonSocial,
		RUC:         ruc,
		Slug:        slug,
	}

	if err := s.tenantRepo.Create(ctx, tenant); err != nil {
		return nil, fmt.Errorf("onboarding.Registrar tenant: %w", err)
	}

	// 2. Crear sede principal
	sede := &model.Sede{
		TenantModel: model.TenantModel{TenantID: tenantID},
		Nombre:      "Local Principal",
		Slug:        "principal",
		Direccion:   direccion,
		EsPrincipal: true,
	}

	if err := s.sedeRepo.Create(ctx, sede); err != nil {
		return nil, fmt.Errorf("onboarding.Registrar sede: %w", err)
	}

	// 3. Buscar plan DEMO
	planDemo, err := s.planRepo.GetByCodigo(ctx, "DEMO")
	if err != nil {
		return nil, fmt.Errorf("onboarding.Registrar plan: %w", err)
	}
	if planDemo == nil {
		return nil, fmt.Errorf("onboarding: plan DEMO no encontrado en la DB")
	}

	// 4. Crear suscripción trial
	suscripcionSvc := NewSuscripcionService(s.suscripcionRepo, s.planRepo)
	suscripcion, err := suscripcionSvc.CrearTrial(ctx, tenantID, planDemo, defaultTrialDays)
	if err != nil {
		return nil, fmt.Errorf("onboarding.Registrar suscripcion: %w", err)
	}

	return &OnboardingResult{
		Tenant:      tenant,
		Sede:        sede,
		Suscripcion: suscripcion,
	}, nil
}
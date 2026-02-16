package service

import (
	"context"
	"fmt"

	"libro-reclamaciones/internal/apperror"
	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/repo"

	"github.com/google/uuid"
)

type PlanService struct {
	planRepo *repo.PlanRepo
}

func NewPlanService(planRepo *repo.PlanRepo) *PlanService {
	return &PlanService{planRepo: planRepo}
}

func (s *PlanService) GetAll(ctx context.Context) ([]model.Plan, error) {
	planes, err := s.planRepo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("plan_service.GetAll: %w", err)
	}
	return planes, nil
}

func (s *PlanService) GetByID(ctx context.Context, id uuid.UUID) (*model.Plan, error) {
	plan, err := s.planRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("plan_service.GetByID: %w", err)
	}
	if plan == nil {
		return nil, apperror.ErrNotFound
	}
	return plan, nil
}

func (s *PlanService) GetByCodigo(ctx context.Context, codigo string) (*model.Plan, error) {
	plan, err := s.planRepo.GetByCodigo(ctx, codigo)
	if err != nil {
		return nil, fmt.Errorf("plan_service.GetByCodigo: %w", err)
	}
	if plan == nil {
		return nil, apperror.ErrNotFound
	}
	return plan, nil
}

func (s *PlanService) Update(ctx context.Context, plan *model.Plan) error {
	existing, err := s.planRepo.GetByID(ctx, plan.ID)
	if err != nil {
		return fmt.Errorf("plan_service.Update: %w", err)
	}
	if existing == nil {
		return apperror.ErrNotFound
	}

	if err := s.planRepo.Update(ctx, plan); err != nil {
		return fmt.Errorf("plan_service.Update: %w", err)
	}
	return nil
}
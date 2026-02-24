package service

import (
	"context"
	"fmt"

	"libro-reclamaciones/internal/apperror"
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/repo"

	"github.com/google/uuid"
)

type UsuarioService struct {
	usuarioRepo   *repo.UsuarioRepo
	dashboardRepo *repo.DashboardRepo
}

func NewUsuarioService(usuarioRepo *repo.UsuarioRepo, dashboardRepo *repo.DashboardRepo) *UsuarioService {
	return &UsuarioService{
		usuarioRepo:   usuarioRepo,
		dashboardRepo: dashboardRepo,
	}
}

func (s *UsuarioService) GetByTenant(ctx context.Context, tenantID uuid.UUID) ([]model.UsuarioAdmin, error) {
	return s.usuarioRepo.GetByTenant(ctx, tenantID)
}

func (s *UsuarioService) GetByID(ctx context.Context, tenantID, userID uuid.UUID) (*model.UsuarioAdmin, error) {
	user, err := s.usuarioRepo.GetByID(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("usuario_service.GetByID: %w", err)
	}
	if user == nil {
		return nil, apperror.ErrNotFound
	}
	return user, nil
}

func (s *UsuarioService) Create(ctx context.Context, tenantID uuid.UUID, email, nombre, password, rol string, sedeID *uuid.UUID, creadoPor uuid.UUID) (*model.UsuarioAdmin, error) {
	// Validar límite del plan
	uso, err := s.dashboardRepo.GetUsoTenant(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("usuario_service.Create: %w", err)
	}
	if uso == nil {
		return nil, apperror.ErrSuscripcionInactiva
	}
	if !uso.CanCreateUsuario() {
		return nil, apperror.ErrPlanLimitUsuarios.Withf(uso.LimiteUsuarios)
	}

	// Validar email único
	existing, err := s.usuarioRepo.GetByEmail(ctx, tenantID, email)
	if err != nil {
		return nil, fmt.Errorf("usuario_service.Create: %w", err)
	}
	if existing != nil {
		return nil, apperror.ErrConflict
	}

	// Hash password
	hash, err := helper.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("usuario_service.Create hash: %w", err)
	}

	user := &model.UsuarioAdmin{
		TenantModel:    model.TenantModel{TenantID: tenantID},
		Email:          email,
		NombreCompleto: nombre,
		PasswordHash:   hash,
		Rol:            rol,
		CreadoPor:      model.NullUUID{UUID: creadoPor, Valid: true},
	}
	if sedeID != nil {
		user.SedeID = model.NullUUID{UUID: *sedeID, Valid: true}
	}

	if err := s.usuarioRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("usuario_service.Create: %w", err)
	}
	return user, nil
}

func (s *UsuarioService) Update(ctx context.Context, tenantID, userID uuid.UUID, nombre, rol string, sedeID *uuid.UUID, activo bool) error {
	user, err := s.usuarioRepo.GetByID(ctx, tenantID, userID)
	if err != nil {
		return fmt.Errorf("usuario_service.Update: %w", err)
	}
	if user == nil {
		return apperror.ErrNotFound
	}

	user.NombreCompleto = nombre
	user.Rol = rol
	user.Activo = activo
	if sedeID != nil {
		user.SedeID = model.NullUUID{UUID: *sedeID, Valid: true}
	} else {
		user.SedeID = model.NullUUID{Valid: false}
	}

	return s.usuarioRepo.Update(ctx, user)
}

func (s *UsuarioService) ChangePassword(ctx context.Context, tenantID, userID uuid.UUID, currentPwd, newPwd string) error {
	user, err := s.usuarioRepo.GetByID(ctx, tenantID, userID)
	if err != nil {
		return fmt.Errorf("usuario_service.ChangePassword: %w", err)
	}
	if user == nil {
		return apperror.ErrNotFound
	}
	if !helper.CheckPassword(currentPwd, user.PasswordHash) {
		return apperror.ErrCredencialesInvalidas
	}

	hash, err := helper.HashPassword(newPwd)
	if err != nil {
		return fmt.Errorf("usuario_service.ChangePassword hash: %w", err)
	}
	return s.usuarioRepo.UpdatePassword(ctx, tenantID, userID, hash)
}

func (s *UsuarioService) AdminResetPassword(ctx context.Context, tenantID, targetUserID uuid.UUID, newPwd string) error {
	user, err := s.usuarioRepo.GetByID(ctx, tenantID, targetUserID)
	if err != nil {
		return fmt.Errorf("usuario_service.AdminResetPassword: %w", err)
	}
	if user == nil {
		return apperror.ErrNotFound
	}
	hash, err := helper.HashPassword(newPwd)
	if err != nil {
		return fmt.Errorf("usuario_service.AdminResetPassword hash: %w", err)
	}
	return s.usuarioRepo.UpdatePassword(ctx, tenantID, targetUserID, hash)
}

func (s *UsuarioService) Deactivate(ctx context.Context, tenantID, userID uuid.UUID) error {
	user, err := s.usuarioRepo.GetByID(ctx, tenantID, userID)
	if err != nil {
		return fmt.Errorf("usuario_service.Deactivate: %w", err)
	}
	if user == nil {
		return apperror.ErrNotFound
	}
	return s.usuarioRepo.Deactivate(ctx, tenantID, userID)
}
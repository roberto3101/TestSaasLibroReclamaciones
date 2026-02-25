package service

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"libro-reclamaciones/internal/apperror"
	"libro-reclamaciones/internal/config"
	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/middleware"
	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/repo"

	"github.com/google/uuid"
)

type AuthService struct {
	usuarioRepo *repo.UsuarioRepo
	sesionRepo *repo.SesionRepo
	tenantRepo  *repo.TenantRepo // <--- Agregamos esto
	jwtCfg config.JWTConfig
}
func NewAuthService(usuarioRepo *repo.UsuarioRepo, sesionRepo *repo.SesionRepo, tenantRepo *repo.TenantRepo, jwtCfg config.JWTConfig) *AuthService {
	return &AuthService{
		usuarioRepo: usuarioRepo,
		sesionRepo: sesionRepo,
		tenantRepo:  tenantRepo, // <--- Agregamos esto
		jwtCfg: jwtCfg,
	}
}

type LoginResult struct {
	Token string `json:"token"`
	ExpiresIn int `json:"expires_in"`
	User struct {
		ID uuid.UUID `json:"id"`
		TenantID       uuid.UUID `json:"tenant_id"`   // <--- Agregado
		TenantSlug     string    `json:"tenant_slug"` // <--- Agregado
		Email          string    `json:"email"`
		NombreCompleto string    `json:"nombre_completo"`
		Rol    string  `json:"rol"`
		SedeID *string `json:"sede_id,omitempty"`
	} `json:"user"`
}

func (s *AuthService) Login(ctx context.Context, email, password, ip, userAgent string) (*LoginResult, error) {
	fmt.Println("========================================")
	fmt.Println(">>> LOGIN ATTEMPT")
	fmt.Println("Email:", email)
	fmt.Println("Password length:", len(password))
	fmt.Println("IP:", ip)
	fmt.Println("========================================")

	// Buscar usuario por email sin filtrar por tenant
	user, err := s.usuarioRepo.GetByEmailGlobal(ctx, email)
	if err != nil {
		fmt.Println(">>> ❌ DB ERROR:", err)
		return nil, fmt.Errorf("auth_service.Login: %w", err)
	}
	
	if user == nil {
		fmt.Println(">>> ❌ USER NOT FOUND")
		return nil, apperror.ErrCredencialesInvalidas
	}

	fmt.Println(">>> ✅ USER FOUND")
	fmt.Println("User ID:", user.ID)
	fmt.Println("User Email:", user.Email)
	fmt.Println("User Activo:", user.Activo)
	fmt.Println("User Rol:", user.Rol)
	fmt.Println("Password Hash (primeros 20 chars):", user.PasswordHash[:20])

	if !user.Activo {
		fmt.Println(">>> ❌ USER INACTIVE")
		return nil, apperror.ErrCuentaInactiva
	}

	fmt.Println(">>> 🔐 CHECKING PASSWORD...")
	passwordMatch := helper.CheckPassword(password, user.PasswordHash)
	fmt.Println(">>> Password match:", passwordMatch)
	
	if !passwordMatch {
		fmt.Println(">>> ❌ PASSWORD MISMATCH")
		return nil, apperror.ErrCredencialesInvalidas
	}

	fmt.Println(">>> ✅ PASSWORD OK!")

	// El tenant se resuelve desde el usuario encontrado
	tenantID := user.TenantID
	fmt.Println(">>> Tenant ID:", tenantID)

	// Generar JWT (incluye sede_id si el usuario tiene sede asignada)
	var sedeID *uuid.UUID
	if user.SedeID.Valid {
		sedeID = &user.SedeID.UUID
	}
	token, err := middleware.GenerateToken(tenantID, user.ID, user.Rol, sedeID, s.jwtCfg)
	if err != nil {
		fmt.Println(">>> ❌ JWT ERROR:", err)
		return nil, fmt.Errorf("auth_service.Login token: %w", err)
	}
	fmt.Println(">>> ✅ JWT Generated")

	// Crear sesión
	tokenHash := helper.SHA256Hash(token)
	expiration := time.Now().Add(time.Duration(s.jwtCfg.ExpirationHours) * time.Hour)

	sesion := &model.Sesion{
		TenantModel:     model.TenantModel{TenantID: tenantID},
		UsuarioID:       user.ID,
		TokenHash:       tokenHash,
		IPAddress:       model.NullString{NullString: sql.NullString{String: ip, Valid: ip != ""}},
		UserAgent:       model.NullString{NullString: sql.NullString{String: userAgent, Valid: userAgent != ""}},
		FechaExpiracion: expiration,
	}

	if err := s.sesionRepo.Create(ctx, sesion); err != nil {
		fmt.Println(">>> ❌ SESSION ERROR:", err)
		return nil, fmt.Errorf("auth_service.Login sesion: %w", err)
	}
	fmt.Println(">>> ✅ Session Created")

	// Actualizar último acceso
	_ = s.usuarioRepo.UpdateUltimoAcceso(ctx, tenantID, user.ID)

	// Obtenemos el slug del tenant usando el repo que ya existe
	tenant, _ := s.tenantRepo.GetByTenantID(ctx, tenantID)

	result := &LoginResult{
		Token: token,
		ExpiresIn: s.jwtCfg.ExpirationHours * 3600,
	}
	result.User.ID = user.ID
	result.User.TenantID = user.TenantID
	result.User.TenantSlug = tenant.Slug // <--- Aquí ya no será undefined
	result.User.Email = user.Email
	result.User.NombreCompleto = user.NombreCompleto
	result.User.Rol = user.Rol
	if user.SedeID.Valid {
		sedeIDStr := user.SedeID.UUID.String()
		result.User.SedeID = &sedeIDStr
	}

	fmt.Println(">>> ✅ LOGIN SUCCESS!")
	fmt.Println("========================================")

	return result, nil
}

func (s *AuthService) Logout(ctx context.Context, tokenHash string) error {
	return s.sesionRepo.InvalidateByToken(ctx, tokenHash)
}
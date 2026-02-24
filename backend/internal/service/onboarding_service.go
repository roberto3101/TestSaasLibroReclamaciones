package service

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode"

	"libro-reclamaciones/internal/helper"
	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/repo"

	"github.com/google/uuid"
	"golang.org/x/text/unicode/norm"
)

// OnboardingService orquesta la creación completa de un tenant nuevo.
type OnboardingService struct {
	db              *sql.DB
	planRepo        *repo.PlanRepo
	tenantRepo      *repo.TenantRepo
	sedeRepo        *repo.SedeRepo
	usuarioRepo     *repo.UsuarioRepo
	suscripcionRepo *repo.SuscripcionRepo
}

func NewOnboardingService(
	db *sql.DB,
	planRepo *repo.PlanRepo,
	tenantRepo *repo.TenantRepo,
	sedeRepo *repo.SedeRepo,
	usuarioRepo *repo.UsuarioRepo,
	suscripcionRepo *repo.SuscripcionRepo,
) *OnboardingService {
	return &OnboardingService{
		db:              db,
		planRepo:        planRepo,
		tenantRepo:      tenantRepo,
		sedeRepo:        sedeRepo,
		usuarioRepo:     usuarioRepo,
		suscripcionRepo: suscripcionRepo,
	}
}

// OnboardingRequest datos necesarios para crear un tenant completo.
type OnboardingRequest struct {
	RazonSocial  string `json:"razon_social"`
	RUC          string `json:"ruc"`
	Email        string `json:"email"`
	Password     string `json:"password"`
	NombreAdmin  string `json:"nombre_admin"`
	Telefono     string `json:"telefono"`
	DiasTrialOverride int `json:"dias_trial,omitempty"` // 0 = usar default (30)
}

// OnboardingResult respuesta con todo lo creado.
type OnboardingResult struct {
	TenantID    uuid.UUID `json:"tenant_id"`
	Slug        string    `json:"slug"`
	Usuario     struct {
		ID    uuid.UUID `json:"id"`
		Email string    `json:"email"`
		Rol   string    `json:"rol"`
	} `json:"usuario"`
	Suscripcion struct {
		PlanCodigo string `json:"plan_codigo"`
		Estado     string `json:"estado"`
		DiasTrial  int    `json:"dias_trial"`
	} `json:"suscripcion"`
	Mensaje string `json:"mensaje"`
}

// Registrar crea un tenant completo en una transacción atómica:
// 1. configuracion_tenant
// 2. sede principal
// 3. usuario admin
// 4. suscripción trial DEMO
func (s *OnboardingService) Registrar(ctx context.Context, req OnboardingRequest) (*OnboardingResult, error) {
	// ── Validaciones básicas ──
	if strings.TrimSpace(req.RazonSocial) == "" {
		return nil, fmt.Errorf("razon_social es obligatorio")
	}
	if strings.TrimSpace(req.RUC) == "" || len(req.RUC) != 11 {
		return nil, fmt.Errorf("RUC debe tener 11 dígitos")
	}
	if strings.TrimSpace(req.Email) == "" {
		return nil, fmt.Errorf("email es obligatorio")
	}
	if len(req.Password) < 8 {
		return nil, fmt.Errorf("password debe tener mínimo 8 caracteres")
	}
	if strings.TrimSpace(req.NombreAdmin) == "" {
		req.NombreAdmin = "Administrador"
	}

	// ── Verificar que el RUC no esté registrado ──
	existente, err := s.buscarTenantPorRUC(ctx, req.RUC)
	if err != nil {
		return nil, fmt.Errorf("onboarding: error verificando RUC: %w", err)
	}
	if existente {
		return nil, fmt.Errorf("ya existe un tenant registrado con el RUC %s", req.RUC)
	}

	// ── Buscar plan DEMO ──
	planDemo, err := s.planRepo.GetByCodigo(ctx, model.PlanDemo)
	if err != nil {
		return nil, fmt.Errorf("onboarding: error buscando plan DEMO: %w", err)
	}
	if planDemo == nil {
		return nil, fmt.Errorf("onboarding: plan DEMO no encontrado en la base de datos")
	}

	// ── Generar datos ──
	tenantID := uuid.New()
	slug := generarSlug(req.RazonSocial)
	passwordHash, err := helper.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("onboarding: error hasheando password: %w", err)
	}

	diasTrial := 30
	if req.DiasTrialOverride > 0 {
		diasTrial = req.DiasTrialOverride
	}

	// ── Transacción atómica ──
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("onboarding: error iniciando transacción: %w", err)
	}
	defer tx.Rollback()

	// 1. Crear configuracion_tenant
	_, err = tx.ExecContext(ctx, `
		INSERT INTO configuracion_tenant (
			tenant_id, razon_social, ruc, slug,
			email_contacto, telefono,
			color_primario, plazo_respuesta_dias,
			notificar_whatsapp, notificar_email
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		tenantID, strings.TrimSpace(req.RazonSocial), req.RUC, slug,
		strings.TrimSpace(req.Email), strings.TrimSpace(req.Telefono),
		"#1a56db", 15,
		false, true,
	)
	if err != nil {
		if strings.Contains(err.Error(), "idx_config_slug") {
			// Slug duplicado → agregar sufijo
			slug = slug + "-" + req.RUC[:4]
			_, err = tx.ExecContext(ctx, `
				INSERT INTO configuracion_tenant (
					tenant_id, razon_social, ruc, slug,
					email_contacto, telefono,
					color_primario, plazo_respuesta_dias,
					notificar_whatsapp, notificar_email
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				tenantID, strings.TrimSpace(req.RazonSocial), req.RUC, slug,
				strings.TrimSpace(req.Email), strings.TrimSpace(req.Telefono),
				"#1a56db", 15,
				false, true,
			)
			if err != nil {
				return nil, fmt.Errorf("onboarding: error creando tenant: %w", err)
			}
		} else {
			return nil, fmt.Errorf("onboarding: error creando tenant: %w", err)
		}
	}

	// 2. Crear sede principal
	_, err = tx.ExecContext(ctx, `
		INSERT INTO sedes (
			tenant_id, nombre, slug, direccion, es_principal, activo
		) VALUES ($1,$2,$3,$4,$5,$6)`,
		tenantID, "Sede Principal", "principal", "Dirección por configurar", true, true,
	)
	if err != nil {
		return nil, fmt.Errorf("onboarding: error creando sede: %w", err)
	}

	// 3. Crear usuario admin
	var usuarioID uuid.UUID
	err = tx.QueryRowContext(ctx, `
		INSERT INTO usuarios_admin (
			tenant_id, email, nombre_completo, password_hash,
			rol, activo, debe_cambiar_password
		) VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING id`,
		tenantID, strings.TrimSpace(req.Email), strings.TrimSpace(req.NombreAdmin),
		passwordHash, model.RolAdmin, true, false,
	).Scan(&usuarioID)
	if err != nil {
		return nil, fmt.Errorf("onboarding: error creando usuario: %w", err)
	}

	// 4. Crear suscripción trial DEMO
	fechaFinTrial := time.Now().AddDate(0, 0, diasTrial)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO suscripciones (
			tenant_id, plan_id, estado, ciclo,
			fecha_inicio, es_trial, dias_trial, fecha_fin_trial,
			activado_por, notas
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		tenantID, planDemo.ID, model.SuscripcionTrial, model.CicloMensual,
		time.Now(), true, diasTrial, fechaFinTrial,
		model.ActivadoPorOnboarding, fmt.Sprintf("Trial %d días — onboarding automático", diasTrial),
	)
	if err != nil {
		return nil, fmt.Errorf("onboarding: error creando suscripción: %w", err)
	}

	// ── Commit ──
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("onboarding: error en commit: %w", err)
	}

	// ── Resultado ──
	result := &OnboardingResult{
		TenantID: tenantID,
		Slug:     slug,
		Mensaje:  fmt.Sprintf("Tenant '%s' creado exitosamente. Ya puede iniciar sesión.", req.RazonSocial),
	}
	result.Usuario.ID = usuarioID
	result.Usuario.Email = req.Email
	result.Usuario.Rol = model.RolAdmin
	result.Suscripcion.PlanCodigo = model.PlanDemo
	result.Suscripcion.Estado = model.SuscripcionTrial
	result.Suscripcion.DiasTrial = diasTrial

	fmt.Printf("[ONBOARDING] ✅ Tenant creado: %s (slug: %s, RUC: %s, admin: %s)\n",
		req.RazonSocial, slug, req.RUC, req.Email)

	return result, nil
}

// ── Helpers ─────────────────────────────────────────────────────────────────

func (s *OnboardingService) buscarTenantPorRUC(ctx context.Context, ruc string) (bool, error) {
	var count int
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM configuracion_tenant WHERE ruc = $1`, ruc,
	).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// generarSlug convierte "Pollería El Rey S.A.C." → "polleria-el-rey-sac"
func generarSlug(texto string) string {
	// Normalizar unicode (quitar tildes)
	t := norm.NFD.String(texto)
	resultado := strings.Builder{}
	for _, r := range t {
		if unicode.Is(unicode.Mn, r) {
			continue // Skip combining marks (tildes)
		}
		resultado.WriteRune(r)
	}
	slug := resultado.String()

	slug = strings.ToLower(slug)
	// Reemplazar caracteres no alfanuméricos por guion
	reg := regexp.MustCompile(`[^a-z0-9]+`)
	slug = reg.ReplaceAllString(slug, "-")
	// Limpiar guiones al inicio/final
	slug = strings.Trim(slug, "-")

	if slug == "" {
		slug = "tenant"
	}

	return slug
}
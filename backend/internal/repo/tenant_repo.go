package repo

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"libro-reclamaciones/internal/model"

	"github.com/google/uuid"
)

type TenantRepo struct {
	db *sql.DB
}

func NewTenantRepo(db *sql.DB) *TenantRepo {
	return &TenantRepo{db: db}
}

func (r *TenantRepo) GetByTenantID(ctx context.Context, tenantID uuid.UUID) (*model.Tenant, error) {
	query := `
		SELECT tenant_id, id, razon_social, ruc, nombre_comercial,
			direccion_legal, departamento, provincia, distrito,
			telefono, email_contacto, logo_url, slug, sitio_web,
			color_primario, plazo_respuesta_dias, mensaje_confirmacion,
			notificar_whatsapp, notificar_email, activo, version,
			fecha_creacion, fecha_actualizacion
		FROM configuracion_tenant
		WHERE tenant_id = $1
		LIMIT 1`

	t := &model.Tenant{}
	err := r.db.QueryRowContext(ctx, query, tenantID).Scan(
		&t.TenantID, &t.ID, &t.RazonSocial, &t.RUC, &t.NombreComercial,
		&t.DireccionLegal, &t.Departamento, &t.Provincia, &t.Distrito,
		&t.Telefono, &t.EmailContacto, &t.LogoURL, &t.Slug, &t.SitioWeb,
		&t.ColorPrimario, &t.PlazoRespuestaDias, &t.MensajeConfirmacion,
		&t.NotificarWhatsapp, &t.NotificarEmail, &t.Activo, &t.Version,
		&t.FechaCreacion, &t.FechaActualizacion,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("tenant_repo.GetByTenantID: %w", err)
	}
	return t, nil
}

func (r *TenantRepo) GetBySlug(ctx context.Context, slug string) (*model.Tenant, error) {
	query := `
		SELECT tenant_id, id, razon_social, ruc, nombre_comercial,
			direccion_legal, departamento, provincia, distrito,
			telefono, email_contacto, logo_url, slug, sitio_web,
			color_primario, plazo_respuesta_dias, mensaje_confirmacion,
			notificar_whatsapp, notificar_email, activo, version,
			fecha_creacion, fecha_actualizacion
		FROM configuracion_tenant
		WHERE slug = $1
		LIMIT 1`

	t := &model.Tenant{}
	err := r.db.QueryRowContext(ctx, query, slug).Scan(
		&t.TenantID, &t.ID, &t.RazonSocial, &t.RUC, &t.NombreComercial,
		&t.DireccionLegal, &t.Departamento, &t.Provincia, &t.Distrito,
		&t.Telefono, &t.EmailContacto, &t.LogoURL, &t.Slug, &t.SitioWeb,
		&t.ColorPrimario, &t.PlazoRespuestaDias, &t.MensajeConfirmacion,
		&t.NotificarWhatsapp, &t.NotificarEmail, &t.Activo, &t.Version,
		&t.FechaCreacion, &t.FechaActualizacion,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("tenant_repo.GetBySlug: %w", err)
	}
	return t, nil
}

func (r *TenantRepo) Create(ctx context.Context, t *model.Tenant) error {
	query := `
		INSERT INTO configuracion_tenant (
			tenant_id, razon_social, ruc, nombre_comercial,
			direccion_legal, departamento, provincia, distrito,
			telefono, email_contacto, logo_url, slug, sitio_web,
			color_primario, plazo_respuesta_dias, mensaje_confirmacion,
			notificar_whatsapp, notificar_email
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		RETURNING id, fecha_creacion, fecha_actualizacion`

	return r.db.QueryRowContext(ctx, query,
		t.TenantID, t.RazonSocial, t.RUC, t.NombreComercial,
		t.DireccionLegal, t.Departamento, t.Provincia, t.Distrito,
		t.Telefono, t.EmailContacto, t.LogoURL, t.Slug, t.SitioWeb,
		t.ColorPrimario, t.PlazoRespuestaDias, t.MensajeConfirmacion,
		t.NotificarWhatsapp, t.NotificarEmail,
	).Scan(&t.ID, &t.FechaCreacion, &t.FechaActualizacion)
}

func (r *TenantRepo) Update(ctx context.Context, t *model.Tenant) error {
	query := `
		UPDATE configuracion_tenant SET
			razon_social = $1, ruc = $2, nombre_comercial = $3,
			direccion_legal = $4, departamento = $5, provincia = $6, distrito = $7,
			telefono = $8, email_contacto = $9, logo_url = $10, sitio_web = $11,
			color_primario = $12, plazo_respuesta_dias = $13, mensaje_confirmacion = $14,
			notificar_whatsapp = $15, notificar_email = $16,
			version = version + 1, fecha_actualizacion = $17
		WHERE tenant_id = $18 AND version = $19`

	// IMPORTANTE: Pasamos t.Campo.NullString para asegurar que el driver SQL reciba el tipo estándar
	result, err := r.db.ExecContext(ctx, query,
		t.RazonSocial, t.RUC, t.NombreComercial.NullString,
		t.DireccionLegal.NullString, t.Departamento.NullString, t.Provincia.NullString, t.Distrito.NullString,
		t.Telefono.NullString, t.EmailContacto.NullString, t.LogoURL.NullString, t.SitioWeb.NullString,
		t.ColorPrimario, t.PlazoRespuestaDias, t.MensajeConfirmacion.NullString,
		t.NotificarWhatsapp, t.NotificarEmail,
		time.Now(), t.TenantID, t.Version,
	)
	if err != nil {
		return fmt.Errorf("tenant_repo.Update: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("optimistic_lock")
	}
	return nil
}
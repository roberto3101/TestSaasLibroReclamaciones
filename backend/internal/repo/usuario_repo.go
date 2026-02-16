package repo

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"libro-reclamaciones/internal/model"

	"github.com/google/uuid"
)

type UsuarioRepo struct {
	db *sql.DB
}

func NewUsuarioRepo(db *sql.DB) *UsuarioRepo {
	return &UsuarioRepo{db: db}
}

func (r *UsuarioRepo) GetByTenant(ctx context.Context, tenantID uuid.UUID) ([]model.UsuarioAdmin, error) {
	query := `
		SELECT tenant_id, id, email, nombre_completo, password_hash,
			rol, activo, debe_cambiar_password, ultimo_acceso,
			sede_id, fecha_creacion, creado_por
		FROM usuarios_admin
		WHERE tenant_id = $1 AND activo = true
		ORDER BY nombre_completo ASC`

	rows, err := r.db.QueryContext(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("usuario_repo.GetByTenant: %w", err)
	}
	defer rows.Close()

	return r.scanUsuarios(rows)
}

func (r *UsuarioRepo) GetByID(ctx context.Context, tenantID, userID uuid.UUID) (*model.UsuarioAdmin, error) {
	query := `
		SELECT tenant_id, id, email, nombre_completo, password_hash,
			rol, activo, debe_cambiar_password, ultimo_acceso,
			sede_id, fecha_creacion, creado_por
		FROM usuarios_admin
		WHERE tenant_id = $1 AND id = $2`

	u := &model.UsuarioAdmin{}
	err := r.db.QueryRowContext(ctx, query, tenantID, userID).Scan(
		&u.TenantID, &u.ID, &u.Email, &u.NombreCompleto, &u.PasswordHash,
		&u.Rol, &u.Activo, &u.DebeCambiarPassword, &u.UltimoAcceso,
		&u.SedeID, &u.FechaCreacion, &u.CreadoPor,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("usuario_repo.GetByID: %w", err)
	}
	return u, nil
}

func (r *UsuarioRepo) GetByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*model.UsuarioAdmin, error) {
	query := `
		SELECT tenant_id, id, email, nombre_completo, password_hash,
			rol, activo, debe_cambiar_password, ultimo_acceso,
			sede_id, fecha_creacion, creado_por
		FROM usuarios_admin
		WHERE tenant_id = $1 AND email = $2`

	u := &model.UsuarioAdmin{}
	err := r.db.QueryRowContext(ctx, query, tenantID, email).Scan(
		&u.TenantID, &u.ID, &u.Email, &u.NombreCompleto, &u.PasswordHash,
		&u.Rol, &u.Activo, &u.DebeCambiarPassword, &u.UltimoAcceso,
		&u.SedeID, &u.FechaCreacion, &u.CreadoPor,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("usuario_repo.GetByEmail: %w", err)
	}
	return u, nil
}

// GetByEmailGlobal busca un usuario activo por email sin filtrar por tenant.
// Se usa en el login para resolver el tenant desde el usuario.
func (r *UsuarioRepo) GetByEmailGlobal(ctx context.Context, email string) (*model.UsuarioAdmin, error) {
	query := `
		SELECT tenant_id, id, email, nombre_completo, password_hash,
			rol, activo, debe_cambiar_password, ultimo_acceso,
			sede_id, fecha_creacion, creado_por
		FROM usuarios_admin
		WHERE email = $1 AND activo = true
		LIMIT 1`

	u := &model.UsuarioAdmin{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&u.TenantID, &u.ID, &u.Email, &u.NombreCompleto, &u.PasswordHash,
		&u.Rol, &u.Activo, &u.DebeCambiarPassword, &u.UltimoAcceso,
		&u.SedeID, &u.FechaCreacion, &u.CreadoPor,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("usuario_repo.GetByEmailGlobal: %w", err)
	}
	return u, nil
}

func (r *UsuarioRepo) Create(ctx context.Context, u *model.UsuarioAdmin) error {
	query := `
		INSERT INTO usuarios_admin (
			tenant_id, email, nombre_completo, password_hash,
			rol, sede_id, creado_por
		) VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING id, fecha_creacion`

	return r.db.QueryRowContext(ctx, query,
		u.TenantID, u.Email, u.NombreCompleto, u.PasswordHash,
		u.Rol, u.SedeID, u.CreadoPor,
	).Scan(&u.ID, &u.FechaCreacion)
}

func (r *UsuarioRepo) Update(ctx context.Context, u *model.UsuarioAdmin) error {
	query := `
		UPDATE usuarios_admin SET
			nombre_completo = $1, rol = $2, sede_id = $3, activo = $4
		WHERE tenant_id = $5 AND id = $6`

	_, err := r.db.ExecContext(ctx, query,
		u.NombreCompleto, u.Rol, u.SedeID, u.Activo,
		u.TenantID, u.ID,
	)
	if err != nil {
		return fmt.Errorf("usuario_repo.Update: %w", err)
	}
	return nil
}

func (r *UsuarioRepo) UpdatePassword(ctx context.Context, tenantID, userID uuid.UUID, hash string) error {
	query := `UPDATE usuarios_admin SET password_hash = $1, debe_cambiar_password = false WHERE tenant_id = $2 AND id = $3`
	_, err := r.db.ExecContext(ctx, query, hash, tenantID, userID)
	if err != nil {
		return fmt.Errorf("usuario_repo.UpdatePassword: %w", err)
	}
	return nil
}

func (r *UsuarioRepo) UpdateUltimoAcceso(ctx context.Context, tenantID, userID uuid.UUID) error {
	query := `UPDATE usuarios_admin SET ultimo_acceso = $1 WHERE tenant_id = $2 AND id = $3`
	_, err := r.db.ExecContext(ctx, query, time.Now(), tenantID, userID)
	if err != nil {
		return fmt.Errorf("usuario_repo.UpdateUltimoAcceso: %w", err)
	}
	return nil
}

func (r *UsuarioRepo) Deactivate(ctx context.Context, tenantID, userID uuid.UUID) error {
	query := `UPDATE usuarios_admin SET activo = false WHERE tenant_id = $1 AND id = $2`
	_, err := r.db.ExecContext(ctx, query, tenantID, userID)
	if err != nil {
		return fmt.Errorf("usuario_repo.Deactivate: %w", err)
	}
	return nil
}

func (r *UsuarioRepo) CountActivos(ctx context.Context, tenantID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM usuarios_admin WHERE tenant_id = $1 AND activo = true", tenantID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("usuario_repo.CountActivos: %w", err)
	}
	return count, nil
}

func (r *UsuarioRepo) scanUsuarios(rows *sql.Rows) ([]model.UsuarioAdmin, error) {
	var usuarios []model.UsuarioAdmin
	for rows.Next() {
		var u model.UsuarioAdmin
		if err := rows.Scan(
			&u.TenantID, &u.ID, &u.Email, &u.NombreCompleto, &u.PasswordHash,
			&u.Rol, &u.Activo, &u.DebeCambiarPassword, &u.UltimoAcceso,
			&u.SedeID, &u.FechaCreacion, &u.CreadoPor,
		); err != nil {
			return nil, fmt.Errorf("usuario_repo.scan: %w", err)
		}
		usuarios = append(usuarios, u)
	}
	return usuarios, rows.Err()
}
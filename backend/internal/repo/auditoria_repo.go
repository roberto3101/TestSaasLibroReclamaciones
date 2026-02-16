package repo

import (
	"context"
	"database/sql"
	"fmt"

	"libro-reclamaciones/internal/model"

	"github.com/google/uuid"
)

type AuditoriaRepo struct {
	db *sql.DB
}

func NewAuditoriaRepo(db *sql.DB) *AuditoriaRepo {
	return &AuditoriaRepo{db: db}
}

func (r *AuditoriaRepo) Create(ctx context.Context, a *model.Auditoria) error {
	query := `
		INSERT INTO auditoria_admin (
			tenant_id, usuario_id, accion, entidad, entidad_id, detalles, ip_address
		) VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING id, fecha`

	return r.db.QueryRowContext(ctx, query,
		a.TenantID, a.UsuarioID, a.Accion, a.Entidad, a.EntidadID, a.Detalles, a.IPAddress,
	).Scan(&a.ID, &a.Fecha)
}

func (r *AuditoriaRepo) GetByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]model.Auditoria, error) {
	query := `
		SELECT tenant_id, id, usuario_id, accion, entidad, entidad_id, detalles, ip_address, fecha
		FROM auditoria_admin
		WHERE tenant_id = $1
		ORDER BY fecha DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.QueryContext(ctx, query, tenantID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("auditoria_repo.GetByTenant: %w", err)
	}
	defer rows.Close()

	var auditorias []model.Auditoria
	for rows.Next() {
		var a model.Auditoria
		if err := rows.Scan(
			&a.TenantID, &a.ID, &a.UsuarioID, &a.Accion, &a.Entidad,
			&a.EntidadID, &a.Detalles, &a.IPAddress, &a.Fecha,
		); err != nil {
			return nil, fmt.Errorf("auditoria_repo.scan: %w", err)
		}
		auditorias = append(auditorias, a)
	}
	return auditorias, rows.Err()
}
package repo

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"libro-reclamaciones/internal/model"

	"github.com/google/uuid"
)

type SuscripcionRepo struct {
	db *sql.DB
}

func NewSuscripcionRepo(db *sql.DB) *SuscripcionRepo {
	return &SuscripcionRepo{db: db}
}

func (r *SuscripcionRepo) GetActiva(ctx context.Context, tenantID uuid.UUID) (*model.Suscripcion, error) {
	query := `
		SELECT tenant_id, id, plan_id, estado, ciclo,
			fecha_inicio, fecha_fin, fecha_proximo_cobro,
			es_trial, dias_trial, fecha_fin_trial,
			override_max_sedes, override_max_usuarios, override_max_reclamos,
			override_max_chatbots, override_max_storage_mb,
			referencia_pago, metodo_pago, activado_por, notas,
			fecha_creacion, fecha_actualizacion
		FROM suscripciones
		WHERE tenant_id = $1 AND estado IN ('ACTIVA', 'TRIAL')
		LIMIT 1`

	s := &model.Suscripcion{}
	err := r.db.QueryRowContext(ctx, query, tenantID).Scan(
		&s.TenantID, &s.ID, &s.PlanID, &s.Estado, &s.Ciclo,
		&s.FechaInicio, &s.FechaFin, &s.FechaProximoCobro,
		&s.EsTrial, &s.DiasTrial, &s.FechaFinTrial,
		&s.OverrideMaxSedes, &s.OverrideMaxUsuarios, &s.OverrideMaxReclamos,
		&s.OverrideMaxChatbots, &s.OverrideMaxStorageMB,
		&s.ReferenciaPago, &s.MetodoPago, &s.ActivadoPor, &s.Notas,
		&s.FechaCreacion, &s.FechaActualizacion,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("suscripcion_repo.GetActiva: %w", err)
	}
	return s, nil
}

func (r *SuscripcionRepo) Create(ctx context.Context, s *model.Suscripcion) error {
	query := `
		INSERT INTO suscripciones (
			tenant_id, plan_id, estado, ciclo,
			fecha_inicio, fecha_fin, fecha_proximo_cobro,
			es_trial, dias_trial, fecha_fin_trial,
			override_max_sedes, override_max_usuarios, override_max_reclamos,
			override_max_chatbots, override_max_storage_mb,
			referencia_pago, metodo_pago, activado_por, notas
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
		RETURNING id, fecha_creacion, fecha_actualizacion`

	return r.db.QueryRowContext(ctx, query,
		s.TenantID, s.PlanID, s.Estado, s.Ciclo,
		s.FechaInicio, s.FechaFin, s.FechaProximoCobro,
		s.EsTrial, s.DiasTrial, s.FechaFinTrial,
		s.OverrideMaxSedes, s.OverrideMaxUsuarios, s.OverrideMaxReclamos,
		s.OverrideMaxChatbots, s.OverrideMaxStorageMB,
		s.ReferenciaPago, s.MetodoPago, s.ActivadoPor, s.Notas,
	).Scan(&s.ID, &s.FechaCreacion, &s.FechaActualizacion)
}

func (r *SuscripcionRepo) CancelActiva(ctx context.Context, tenantID uuid.UUID) error {
	query := `
		UPDATE suscripciones
		SET estado = 'CANCELADA', fecha_actualizacion = $1
		WHERE tenant_id = $2 AND estado IN ('ACTIVA', 'TRIAL')`

	_, err := r.db.ExecContext(ctx, query, time.Now(), tenantID)
	if err != nil {
		return fmt.Errorf("suscripcion_repo.CancelActiva: %w", err)
	}
	return nil
}

func (r *SuscripcionRepo) GetHistorial(ctx context.Context, tenantID uuid.UUID) ([]model.Suscripcion, error) {
	query := `
		SELECT tenant_id, id, plan_id, estado, ciclo,
			fecha_inicio, fecha_fin, fecha_proximo_cobro,
			es_trial, dias_trial, fecha_fin_trial,
			override_max_sedes, override_max_usuarios, override_max_reclamos,
			override_max_chatbots, override_max_storage_mb,
			referencia_pago, metodo_pago, activado_por, notas,
			fecha_creacion, fecha_actualizacion
		FROM suscripciones
		WHERE tenant_id = $1
		ORDER BY fecha_creacion DESC`

	rows, err := r.db.QueryContext(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("suscripcion_repo.GetHistorial: %w", err)
	}
	defer rows.Close()

	var suscripciones []model.Suscripcion
	for rows.Next() {
		var s model.Suscripcion
		if err := rows.Scan(
			&s.TenantID, &s.ID, &s.PlanID, &s.Estado, &s.Ciclo,
			&s.FechaInicio, &s.FechaFin, &s.FechaProximoCobro,
			&s.EsTrial, &s.DiasTrial, &s.FechaFinTrial,
			&s.OverrideMaxSedes, &s.OverrideMaxUsuarios, &s.OverrideMaxReclamos,
			&s.OverrideMaxChatbots, &s.OverrideMaxStorageMB,
			&s.ReferenciaPago, &s.MetodoPago, &s.ActivadoPor, &s.Notas,
			&s.FechaCreacion, &s.FechaActualizacion,
		); err != nil {
			return nil, fmt.Errorf("suscripcion_repo.scan: %w", err)
		}
		suscripciones = append(suscripciones, s)
	}
	return suscripciones, rows.Err()
}
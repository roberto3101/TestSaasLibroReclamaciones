package repo

import (
	"context"
	"database/sql"
	"fmt"

	"libro-reclamaciones/internal/model"

	"github.com/google/uuid"
)

type PlanRepo struct {
	db *sql.DB
}

func NewPlanRepo(db *sql.DB) *PlanRepo {
	return &PlanRepo{db: db}
}

func (r *PlanRepo) GetAll(ctx context.Context) ([]model.Plan, error) {
	query := `
		SELECT id, codigo, nombre, descripcion,
			precio_mensual, precio_anual,
			max_sedes, max_usuarios, max_reclamos_mes, max_chatbots,
			permite_chatbot, permite_whatsapp, permite_email,
			permite_reportes_pdf, permite_exportar_excel, permite_api,
			permite_marca_blanca, permite_multi_idioma,
			max_storage_mb, orden, activo, destacado, fecha_creacion
		FROM planes
		WHERE activo = true
		ORDER BY orden ASC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("plan_repo.GetAll: %w", err)
	}
	defer rows.Close()

	return scanPlanes(rows)
}

func (r *PlanRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.Plan, error) {
	query := `
		SELECT id, codigo, nombre, descripcion,
			precio_mensual, precio_anual,
			max_sedes, max_usuarios, max_reclamos_mes, max_chatbots,
			permite_chatbot, permite_whatsapp, permite_email,
			permite_reportes_pdf, permite_exportar_excel, permite_api,
			permite_marca_blanca, permite_multi_idioma,
			max_storage_mb, orden, activo, destacado, fecha_creacion
		FROM planes
		WHERE id = $1`

	plan := &model.Plan{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&plan.ID, &plan.Codigo, &plan.Nombre, &plan.Descripcion,
		&plan.PrecioMensual, &plan.PrecioAnual,
		&plan.MaxSedes, &plan.MaxUsuarios, &plan.MaxReclamosMes, &plan.MaxChatbots,
		&plan.PermiteChatbot, &plan.PermiteWhatsapp, &plan.PermiteEmail,
		&plan.PermiteReportesPDF, &plan.PermiteExportarExcel, &plan.PermiteAPI,
		&plan.PermiteMarcaBlanca, &plan.PermiteMultiIdioma,
		&plan.MaxStorageMB, &plan.Orden, &plan.Activo, &plan.Destacado, &plan.FechaCreacion,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("plan_repo.GetByID: %w", err)
	}
	return plan, nil
}

func (r *PlanRepo) GetByCodigo(ctx context.Context, codigo string) (*model.Plan, error) {
	query := `
		SELECT id, codigo, nombre, descripcion,
			precio_mensual, precio_anual,
			max_sedes, max_usuarios, max_reclamos_mes, max_chatbots,
			permite_chatbot, permite_whatsapp, permite_email,
			permite_reportes_pdf, permite_exportar_excel, permite_api,
			permite_marca_blanca, permite_multi_idioma,
			max_storage_mb, orden, activo, destacado, fecha_creacion
		FROM planes
		WHERE codigo = $1`

	plan := &model.Plan{}
	err := r.db.QueryRowContext(ctx, query, codigo).Scan(
		&plan.ID, &plan.Codigo, &plan.Nombre, &plan.Descripcion,
		&plan.PrecioMensual, &plan.PrecioAnual,
		&plan.MaxSedes, &plan.MaxUsuarios, &plan.MaxReclamosMes, &plan.MaxChatbots,
		&plan.PermiteChatbot, &plan.PermiteWhatsapp, &plan.PermiteEmail,
		&plan.PermiteReportesPDF, &plan.PermiteExportarExcel, &plan.PermiteAPI,
		&plan.PermiteMarcaBlanca, &plan.PermiteMultiIdioma,
		&plan.MaxStorageMB, &plan.Orden, &plan.Activo, &plan.Destacado, &plan.FechaCreacion,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("plan_repo.GetByCodigo: %w", err)
	}
	return plan, nil
}

func (r *PlanRepo) Update(ctx context.Context, plan *model.Plan) error {
	query := `
		UPDATE planes SET
			nombre = $1, descripcion = $2,
			precio_mensual = $3, precio_anual = $4,
			max_sedes = $5, max_usuarios = $6, max_reclamos_mes = $7, max_chatbots = $8,
			permite_chatbot = $9, permite_whatsapp = $10, permite_email = $11,
			permite_reportes_pdf = $12, permite_exportar_excel = $13, permite_api = $14,
			permite_marca_blanca = $15, permite_multi_idioma = $16,
			max_storage_mb = $17, orden = $18, activo = $19, destacado = $20
		WHERE id = $21`

	_, err := r.db.ExecContext(ctx, query,
		plan.Nombre, plan.Descripcion,
		plan.PrecioMensual, plan.PrecioAnual,
		plan.MaxSedes, plan.MaxUsuarios, plan.MaxReclamosMes, plan.MaxChatbots,
		plan.PermiteChatbot, plan.PermiteWhatsapp, plan.PermiteEmail,
		plan.PermiteReportesPDF, plan.PermiteExportarExcel, plan.PermiteAPI,
		plan.PermiteMarcaBlanca, plan.PermiteMultiIdioma,
		plan.MaxStorageMB, plan.Orden, plan.Activo, plan.Destacado,
		plan.ID,
	)
	if err != nil {
		return fmt.Errorf("plan_repo.Update: %w", err)
	}
	return nil
}

func scanPlanes(rows *sql.Rows) ([]model.Plan, error) {
	var planes []model.Plan
	for rows.Next() {
		var p model.Plan
		if err := rows.Scan(
			&p.ID, &p.Codigo, &p.Nombre, &p.Descripcion,
			&p.PrecioMensual, &p.PrecioAnual,
			&p.MaxSedes, &p.MaxUsuarios, &p.MaxReclamosMes, &p.MaxChatbots,
			&p.PermiteChatbot, &p.PermiteWhatsapp, &p.PermiteEmail,
			&p.PermiteReportesPDF, &p.PermiteExportarExcel, &p.PermiteAPI,
			&p.PermiteMarcaBlanca, &p.PermiteMultiIdioma,
			&p.MaxStorageMB, &p.Orden, &p.Activo, &p.Destacado, &p.FechaCreacion,
		); err != nil {
			return nil, fmt.Errorf("plan_repo.scan: %w", err)
		}
		planes = append(planes, p)
	}
	return planes, rows.Err()
}
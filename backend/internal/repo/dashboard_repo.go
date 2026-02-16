package repo

import (
	"context"
	"database/sql"
	"fmt"

	"libro-reclamaciones/internal/model"

	"github.com/google/uuid"
)

type DashboardRepo struct {
	db *sql.DB
}

func NewDashboardRepo(db *sql.DB) *DashboardRepo {
	return &DashboardRepo{db: db}
}

// GetUsoTenant consulta la vista v_uso_tenant para validar límites del plan.
func (r *DashboardRepo) GetUsoTenant(ctx context.Context, tenantID uuid.UUID) (*model.UsoTenant, error) {
	query := `
		SELECT tenant_id,
			plan_codigo, plan_nombre, suscripcion_estado, suscripcion_fecha_fin,
			limite_sedes, limite_usuarios, limite_reclamos_mes, limite_chatbots, limite_storage_mb,
			permite_chatbot, permite_whatsapp, permite_email,
			permite_reportes_pdf, permite_exportar_excel, permite_api, permite_marca_blanca,
			uso_sedes, uso_usuarios, uso_reclamos_mes, uso_chatbots
		FROM v_uso_tenant
		WHERE tenant_id = $1`

	u := &model.UsoTenant{}
	err := r.db.QueryRowContext(ctx, query, tenantID).Scan(
		&u.TenantID,
		&u.PlanCodigo, &u.PlanNombre, &u.SuscripcionEstado, &u.SuscripcionFechaFin,
		&u.LimiteSedes, &u.LimiteUsuarios, &u.LimiteReclamosMes, &u.LimiteChatbots, &u.LimiteStorageMB,
		&u.PermiteChatbot, &u.PermiteWhatsapp, &u.PermiteEmail,
		&u.PermiteReportesPDF, &u.PermiteExportarExcel, &u.PermiteAPI, &u.PermiteMarcaBlanca,
		&u.UsoSedes, &u.UsoUsuarios, &u.UsoReclamosMes, &u.UsoChatbots,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("dashboard_repo.GetUsoTenant: %w", err)
	}
	return u, nil
}
package repo

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/model/dto"

	"github.com/google/uuid"
)

type ReclamoRepo struct {
	db *sql.DB
}

func NewReclamoRepo(db *sql.DB) *ReclamoRepo {
	return &ReclamoRepo{db: db}
}

func (r *ReclamoRepo) GetByTenant(ctx context.Context, tenantID uuid.UUID, pag dto.PaginationRequest, sedeID *uuid.UUID, fechaDesde, fechaHasta *time.Time) ([]model.Reclamo, int, error) {
	where := "r.tenant_id = $1 AND r.deleted_at IS NULL"
	args := []interface{}{tenantID}
	argIdx := 2

	if sedeID != nil {
		where += fmt.Sprintf(" AND r.sede_id = $%d", argIdx)
		args = append(args, *sedeID)
		argIdx++
	}
	if fechaDesde != nil {
		where += fmt.Sprintf(" AND r.fecha_registro >= $%d", argIdx)
		args = append(args, *fechaDesde)
		argIdx++
	}
	if fechaHasta != nil {
		where += fmt.Sprintf(" AND r.fecha_registro <= $%d", argIdx)
		args = append(args, *fechaHasta)
		argIdx++
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM reclamos r WHERE %s", where)
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("reclamo_repo.GetByTenant count: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT r.tenant_id, r.id, r.codigo_reclamo, r.tipo_solicitud, r.estado,
			r.nombre_completo, r.tipo_documento, r.numero_documento, r.telefono, r.email,
			r.domicilio, r.departamento, r.provincia, r.distrito, r.menor_de_edad, r.nombre_apoderado,
			r.razon_social_proveedor, r.ruc_proveedor, r.direccion_proveedor,
			r.sede_id, r.sede_nombre, r.sede_direccion,
			r.tipo_bien, r.monto_reclamado, r.descripcion_bien, r.numero_pedido,
			r.area_queja, r.descripcion_situacion,
			r.fecha_incidente, r.detalle_reclamo, r.pedido_consumidor,
			r.firma_digital, r.ip_address, r.user_agent,
			r.acepta_terminos, r.acepta_copia,
			r.fecha_registro, r.fecha_limite_respuesta, r.fecha_respuesta, r.fecha_cierre,
			r.atendido_por, r.canal_origen, r.deleted_at,
			COALESCE(ua.nombre_completo, '')
		FROM reclamos r
		LEFT JOIN usuarios_admin ua ON r.tenant_id = ua.tenant_id AND r.atendido_por = ua.id
		WHERE %s
		ORDER BY r.fecha_registro DESC
		LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)

	args = append(args, pag.Limit(), pag.Offset())

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("reclamo_repo.GetByTenant: %w", err)
	}
	defer rows.Close()

	reclamos, err := r.scanReclamos(rows)
	return reclamos, total, err
}

func (r *ReclamoRepo) GetByID(ctx context.Context, tenantID, reclamoID uuid.UUID) (*model.Reclamo, error) {
	query := `
		SELECT r.tenant_id, r.id, r.codigo_reclamo, r.tipo_solicitud, r.estado,
			r.nombre_completo, r.tipo_documento, r.numero_documento, r.telefono, r.email,
			r.domicilio, r.departamento, r.provincia, r.distrito, r.menor_de_edad, r.nombre_apoderado,
			r.razon_social_proveedor, r.ruc_proveedor, r.direccion_proveedor,
			r.sede_id, r.sede_nombre, r.sede_direccion,
			r.tipo_bien, r.monto_reclamado, r.descripcion_bien, r.numero_pedido,
			r.area_queja, r.descripcion_situacion,
			r.fecha_incidente, r.detalle_reclamo, r.pedido_consumidor,
			r.firma_digital, r.ip_address, r.user_agent,
			r.acepta_terminos, r.acepta_copia,
			r.fecha_registro, r.fecha_limite_respuesta, r.fecha_respuesta, r.fecha_cierre,
			r.atendido_por, r.canal_origen, r.deleted_at,
			COALESCE(ua.nombre_completo, '')
		FROM reclamos r
		LEFT JOIN usuarios_admin ua ON r.tenant_id = ua.tenant_id AND r.atendido_por = ua.id
		WHERE r.tenant_id = $1 AND r.id = $2 AND r.deleted_at IS NULL`

	rec := &model.Reclamo{}
	err := r.db.QueryRowContext(ctx, query, tenantID, reclamoID).Scan(
		&rec.TenantID, &rec.ID, &rec.CodigoReclamo, &rec.TipoSolicitud, &rec.Estado,
		&rec.NombreCompleto, &rec.TipoDocumento, &rec.NumeroDocumento, &rec.Telefono, &rec.Email,
		&rec.Domicilio, &rec.Departamento, &rec.Provincia, &rec.Distrito, &rec.MenorDeEdad, &rec.NombreApoderado,
		&rec.RazonSocialProveedor, &rec.RUCProveedor, &rec.DireccionProveedor,
		&rec.SedeID, &rec.SedeNombre, &rec.SedeDireccion,
		&rec.TipoBien, &rec.MontoReclamado, &rec.DescripcionBien, &rec.NumeroPedido,
		&rec.AreaQueja, &rec.DescripcionSituacion,
		&rec.FechaIncidente, &rec.DetalleReclamo, &rec.PedidoConsumidor,
		&rec.FirmaDigital, &rec.IPAddress, &rec.UserAgent,
		&rec.AceptaTerminos, &rec.AceptaCopia,
		&rec.FechaRegistro, &rec.FechaLimiteRespuesta, &rec.FechaRespuesta, &rec.FechaCierre,
		&rec.AtendidoPor, &rec.CanalOrigen, &rec.DeletedAt,
		&rec.NombreAtendidoPor,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("reclamo_repo.GetByID: %w", err)
	}
	return rec, nil
}

func (r *ReclamoRepo) Create(ctx context.Context, rec *model.Reclamo) error {
	query := `
		INSERT INTO reclamos (
			tenant_id, codigo_reclamo, tipo_solicitud, estado,
			nombre_completo, tipo_documento, numero_documento, telefono, email,
			domicilio, departamento, provincia, distrito, menor_de_edad, nombre_apoderado,
			razon_social_proveedor, ruc_proveedor, direccion_proveedor,
			sede_id, sede_nombre, sede_direccion,
			tipo_bien, monto_reclamado, descripcion_bien, numero_pedido,
			area_queja, descripcion_situacion,
			fecha_incidente, detalle_reclamo, pedido_consumidor,
			firma_digital, ip_address, user_agent,
			acepta_terminos, acepta_copia,
			fecha_limite_respuesta, canal_origen
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37)
		RETURNING id, fecha_registro`

	return r.db.QueryRowContext(ctx, query,
		rec.TenantID, rec.CodigoReclamo, rec.TipoSolicitud, rec.Estado,
		rec.NombreCompleto, rec.TipoDocumento, rec.NumeroDocumento, rec.Telefono, rec.Email,
		rec.Domicilio, rec.Departamento, rec.Provincia, rec.Distrito, rec.MenorDeEdad, rec.NombreApoderado,
		rec.RazonSocialProveedor, rec.RUCProveedor, rec.DireccionProveedor,
		rec.SedeID, rec.SedeNombre, rec.SedeDireccion,
		rec.TipoBien, rec.MontoReclamado, rec.DescripcionBien, rec.NumeroPedido,
		rec.AreaQueja, rec.DescripcionSituacion,
		rec.FechaIncidente, rec.DetalleReclamo, rec.PedidoConsumidor,
		rec.FirmaDigital, rec.IPAddress, rec.UserAgent,
		rec.AceptaTerminos, rec.AceptaCopia,
		rec.FechaLimiteRespuesta, rec.CanalOrigen,
	).Scan(&rec.ID, &rec.FechaRegistro)
}

func (r *ReclamoRepo) UpdateEstado(ctx context.Context, tenantID, reclamoID uuid.UUID, estado string, userID *uuid.UUID) error {
	query := `UPDATE reclamos SET estado = $1, atendido_por = COALESCE(atendido_por, $4) WHERE tenant_id = $2 AND id = $3 AND deleted_at IS NULL`
	result, err := r.db.ExecContext(ctx, query, estado, tenantID, reclamoID, userID)
	if err != nil {
		return fmt.Errorf("reclamo_repo.UpdateEstado: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("not_found")
	}
	return nil
}

func (r *ReclamoRepo) UpdateFechaRespuesta(ctx context.Context, tenantID, reclamoID uuid.UUID) error {
	query := `UPDATE reclamos SET fecha_respuesta = $1 WHERE tenant_id = $2 AND id = $3`
	_, err := r.db.ExecContext(ctx, query, time.Now(), tenantID, reclamoID)
	return err
}

func (r *ReclamoRepo) Asignar(ctx context.Context, tenantID, reclamoID, adminID uuid.UUID) error {
	query := `UPDATE reclamos SET atendido_por = $1 WHERE tenant_id = $2 AND id = $3 AND deleted_at IS NULL`
	_, err := r.db.ExecContext(ctx, query, adminID, tenantID, reclamoID)
	if err != nil {
		return fmt.Errorf("reclamo_repo.Asignar: %w", err)
	}
	return nil
}

func (r *ReclamoRepo) SoftDelete(ctx context.Context, tenantID, reclamoID uuid.UUID) error {
	query := `UPDATE reclamos SET deleted_at = $1 WHERE tenant_id = $2 AND id = $3 AND deleted_at IS NULL`
	_, err := r.db.ExecContext(ctx, query, time.Now(), tenantID, reclamoID)
	if err != nil {
		return fmt.Errorf("reclamo_repo.SoftDelete: %w", err)
	}
	return nil
}







func (r *ReclamoRepo) GetByCodigoPublico(ctx context.Context, tenantID uuid.UUID, codigo string) (*model.Reclamo, error) {
	query := `
		SELECT id, codigo_reclamo, tipo_solicitud, estado,
			fecha_registro, fecha_limite_respuesta, fecha_respuesta,
			sede_nombre, descripcion_bien, detalle_reclamo
		FROM reclamos
		WHERE tenant_id = $1 AND codigo_reclamo = $2 AND deleted_at IS NULL`

	rec := &model.Reclamo{}
	err := r.db.QueryRowContext(ctx, query, tenantID, codigo).Scan(
		&rec.ID, &rec.CodigoReclamo, &rec.TipoSolicitud, &rec.Estado,
		&rec.FechaRegistro, &rec.FechaLimiteRespuesta, &rec.FechaRespuesta,
		&rec.SedeNombre, &rec.DescripcionBien, &rec.DetalleReclamo,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("reclamo_repo.GetByCodigoPublico: %w", err)
	}
	// Asignamos el tenantID manualmente ya que lo tenemos
	rec.TenantID = tenantID
	return rec, nil
}



func (r *ReclamoRepo) scanReclamos(rows *sql.Rows) ([]model.Reclamo, error) {
	var reclamos []model.Reclamo
	for rows.Next() {
		var rec model.Reclamo
		if err := rows.Scan(
			&rec.TenantID, &rec.ID, &rec.CodigoReclamo, &rec.TipoSolicitud, &rec.Estado,
			&rec.NombreCompleto, &rec.TipoDocumento, &rec.NumeroDocumento, &rec.Telefono, &rec.Email,
			&rec.Domicilio, &rec.Departamento, &rec.Provincia, &rec.Distrito, &rec.MenorDeEdad, &rec.NombreApoderado,
			&rec.RazonSocialProveedor, &rec.RUCProveedor, &rec.DireccionProveedor,
			&rec.SedeID, &rec.SedeNombre, &rec.SedeDireccion,
			&rec.TipoBien, &rec.MontoReclamado, &rec.DescripcionBien, &rec.NumeroPedido,
			&rec.AreaQueja, &rec.DescripcionSituacion,
			&rec.FechaIncidente, &rec.DetalleReclamo, &rec.PedidoConsumidor,
			&rec.FirmaDigital, &rec.IPAddress, &rec.UserAgent,
			&rec.AceptaTerminos, &rec.AceptaCopia,
			&rec.FechaRegistro, &rec.FechaLimiteRespuesta, &rec.FechaRespuesta, &rec.FechaCierre,
			&rec.AtendidoPor, &rec.CanalOrigen, &rec.DeletedAt,
			&rec.NombreAtendidoPor,
		); err != nil {
			return nil, fmt.Errorf("reclamo_repo.scan: %w", err)
		}
		reclamos = append(reclamos, rec)
	}
	return reclamos, rows.Err()

	

















	
}
// FiltrosExportacion define los criterios de filtrado para exportar reclamos.
type FiltrosExportacion struct {
	TenantID    uuid.UUID
	SedeID      *uuid.UUID
	AtendidoPor *uuid.UUID
	FechaDesde  *time.Time
	FechaHasta  *time.Time
}

// ObtenerParaExportacion retorna reclamos según filtros, sin paginación (máx 10000).
// Incluye JOIN con usuarios_admin para obtener el nombre del usuario que atendió.
func (r *ReclamoRepo) ObtenerParaExportacion(ctx context.Context, filtros FiltrosExportacion) ([]model.Reclamo, error) {
	where := "r.tenant_id = $1 AND r.deleted_at IS NULL"
	args := []interface{}{filtros.TenantID}
	argIdx := 2

	if filtros.SedeID != nil {
		where += fmt.Sprintf(" AND r.sede_id = $%d", argIdx)
		args = append(args, *filtros.SedeID)
		argIdx++
	}
	if filtros.AtendidoPor != nil {
		where += fmt.Sprintf(" AND r.atendido_por = $%d", argIdx)
		args = append(args, *filtros.AtendidoPor)
		argIdx++
	}
	if filtros.FechaDesde != nil {
		where += fmt.Sprintf(" AND r.fecha_registro >= $%d", argIdx)
		args = append(args, *filtros.FechaDesde)
		argIdx++
	}
	if filtros.FechaHasta != nil {
		where += fmt.Sprintf(" AND r.fecha_registro <= $%d", argIdx)
		args = append(args, *filtros.FechaHasta)
		argIdx++
	}

	query := fmt.Sprintf(`
		SELECT r.tenant_id, r.id, r.codigo_reclamo, r.tipo_solicitud, r.estado,
			r.nombre_completo, r.tipo_documento, r.numero_documento, r.telefono, r.email,
			r.domicilio, r.departamento, r.provincia, r.distrito, r.menor_de_edad, r.nombre_apoderado,
			r.razon_social_proveedor, r.ruc_proveedor, r.direccion_proveedor,
			r.sede_id, r.sede_nombre, r.sede_direccion,
			r.tipo_bien, r.monto_reclamado, r.descripcion_bien, r.numero_pedido,
			r.area_queja, r.descripcion_situacion,
			r.fecha_incidente, r.detalle_reclamo, r.pedido_consumidor,
			r.firma_digital, r.ip_address, r.user_agent,
			r.acepta_terminos, r.acepta_copia,
			r.fecha_registro, r.fecha_limite_respuesta, r.fecha_respuesta, r.fecha_cierre,
			r.atendido_por, r.canal_origen, r.deleted_at,
			COALESCE(ua.nombre_completo, '')
		FROM reclamos r
		LEFT JOIN usuarios_admin ua ON r.tenant_id = ua.tenant_id AND r.atendido_por = ua.id
		WHERE %s
		ORDER BY r.fecha_registro DESC
		LIMIT 10000`, where)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("reclamo_repo.ObtenerParaExportacion: %w", err)
	}
	defer rows.Close()

	var reclamos []model.Reclamo
	for rows.Next() {
		var rec model.Reclamo
		if err := rows.Scan(
			&rec.TenantID, &rec.ID, &rec.CodigoReclamo, &rec.TipoSolicitud, &rec.Estado,
			&rec.NombreCompleto, &rec.TipoDocumento, &rec.NumeroDocumento, &rec.Telefono, &rec.Email,
			&rec.Domicilio, &rec.Departamento, &rec.Provincia, &rec.Distrito, &rec.MenorDeEdad, &rec.NombreApoderado,
			&rec.RazonSocialProveedor, &rec.RUCProveedor, &rec.DireccionProveedor,
			&rec.SedeID, &rec.SedeNombre, &rec.SedeDireccion,
			&rec.TipoBien, &rec.MontoReclamado, &rec.DescripcionBien, &rec.NumeroPedido,
			&rec.AreaQueja, &rec.DescripcionSituacion,
			&rec.FechaIncidente, &rec.DetalleReclamo, &rec.PedidoConsumidor,
			&rec.FirmaDigital, &rec.IPAddress, &rec.UserAgent,
			&rec.AceptaTerminos, &rec.AceptaCopia,
			&rec.FechaRegistro, &rec.FechaLimiteRespuesta, &rec.FechaRespuesta, &rec.FechaCierre,
			&rec.AtendidoPor, &rec.CanalOrigen, &rec.DeletedAt,
			&rec.NombreAtendidoPor,
		); err != nil {
			return nil, fmt.Errorf("reclamo_repo.ObtenerParaExportacion scan: %w", err)
		}
		reclamos = append(reclamos, rec)
	}
	return reclamos, rows.Err()
}
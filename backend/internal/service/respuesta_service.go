package service

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"

	"libro-reclamaciones/internal/apperror"
	"libro-reclamaciones/internal/model"
	"libro-reclamaciones/internal/repo"

	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
)

type RespuestaService struct {
	respuestaRepo *repo.RespuestaRepo
	reclamoRepo   *repo.ReclamoRepo
	historialRepo *repo.HistorialRepo
	notifService  *NotificacionService
	tenantRepo    *repo.TenantRepo
}

func NewRespuestaService(respuestaRepo *repo.RespuestaRepo, reclamoRepo *repo.ReclamoRepo, historialRepo *repo.HistorialRepo, notifService *NotificacionService, tenantRepo *repo.TenantRepo) *RespuestaService {
	return &RespuestaService{
		respuestaRepo: respuestaRepo,
		reclamoRepo:   reclamoRepo,
		historialRepo: historialRepo,
		notifService:  notifService,
		tenantRepo:    tenantRepo,
	}
}

func (s *RespuestaService) GetByReclamo(ctx context.Context, tenantID, reclamoID uuid.UUID) ([]model.Respuesta, error) {
	return s.respuestaRepo.GetByReclamo(ctx, tenantID, reclamoID)
}

func (s *RespuestaService) Crear(ctx context.Context, tenantID, reclamoID, userID uuid.UUID, respuestaTexto, accionTomada, compensacion, cargo, ip string) (*model.Respuesta, error) {
	// 1. Obtener datos del reclamo
	reclamo, err := s.reclamoRepo.GetByID(ctx, tenantID, reclamoID)
	if err != nil {
		return nil, fmt.Errorf("respuesta_service.Crear: %w", err)
	}
	if reclamo == nil {
		return nil, apperror.ErrNotFound
	}

	// 2. Preparar objeto Respuesta
	resp := &model.Respuesta{
		TenantModel:          model.TenantModel{TenantID: tenantID},
		ReclamoID:            reclamoID,
		RespuestaEmpresa:     respuestaTexto,
		AccionTomada:         model.NullString{NullString: sql.NullString{String: accionTomada, Valid: accionTomada != ""}},
		CompensacionOfrecida: model.NullString{NullString: sql.NullString{String: compensacion, Valid: compensacion != ""}},
		RespondidoPor:        model.NullUUID{UUID: userID, Valid: true},
		CargoResponsable:     model.NullString{NullString: sql.NullString{String: cargo, Valid: cargo != ""}},
		Origen:               model.OrigenPanel,
	}

	// 3. Guardar respuesta
	if err := s.respuestaRepo.Create(ctx, resp); err != nil {
		return nil, fmt.Errorf("respuesta_service.Crear: %w", err)
	}

	// 4. Actualizar fecha de respuesta
	_ = s.reclamoRepo.UpdateFechaRespuesta(ctx, tenantID, reclamoID)

	// 5. Cambiar estado a RESUELTO automáticamente si está pendiente o en proceso
	estadoAnterior := reclamo.Estado
	if estadoAnterior == model.EstadoPendiente || estadoAnterior == model.EstadoEnProceso {
		_ = s.reclamoRepo.UpdateEstado(ctx, tenantID, reclamoID, model.EstadoResuelto)
	}

	// 6. Registrar historial de la respuesta
	_ = s.historialRepo.Create(ctx, &model.Historial{
		TenantModel:    model.TenantModel{TenantID: tenantID},
		ReclamoID:      reclamoID,
		EstadoAnterior: model.NullString{NullString: sql.NullString{String: estadoAnterior, Valid: true}},
		EstadoNuevo:    model.EstadoResuelto,
		TipoAccion:     model.AccionRespuesta,
		UsuarioAccion:  model.NullUUID{UUID: userID, Valid: true},
		IPAddress:      model.NullString{NullString: sql.NullString{String: ip, Valid: ip != ""}},
	})

	// 7. Generación de PDF y envío (Background)
	if reclamo.Email != "" {
		// Capturamos variables para evitar punteros nulos en la goroutine
		targetEmail := reclamo.Email
		codigo := reclamo.CodigoReclamo
		nombreCli := reclamo.NombreCompleto
		tDoc, nDoc := reclamo.TipoDocumento, reclamo.NumeroDocumento
		detReclamo := reclamo.DetalleReclamo
		pedidoCli := reclamo.PedidoConsumidor
		fechaReg := reclamo.FechaRegistro.Format("02/01/2006")

		// Datos del consumidor para el PDF
		domicilioCli := reclamo.Domicilio.String
		telefonoCli := reclamo.Telefono
		emailCli := reclamo.Email

		// Datos del Proveedor (snapshot)
		rSoc := reclamo.RazonSocialProveedor.String
		ruc := reclamo.RUCProveedor.String

		// Sede y Dirección
		sedeNom := reclamo.SedeNombre.String
		if sedeNom == "" {
			sedeNom = "Establecimiento no especificado"
		}

		sedeDir := reclamo.SedeDireccion.String
		if sedeDir == "" {
			sedeDir = reclamo.DireccionProveedor.String
		}
		if sedeDir == "" {
			sedeDir = "No registrada en el sistema"
		}

		go func() {
			defer func() {
				if r := recover(); r != nil {
					fmt.Printf("[CRITICAL] Panic en goroutine PDF: %v\n", r)
				}
			}()

			pdf := gofpdf.New("P", "mm", "A4", "")
			tr := pdf.UnicodeTranslatorFromDescriptor("")
			pdf.AddPage()

			// --- ENCABEZADO ---
			pdf.SetFillColor(28, 63, 170)
			pdf.SetTextColor(255, 255, 255)
			pdf.SetFont("Arial", "B", 14)
			pdf.CellFormat(0, 12, tr("RESOLUCIÓN DE HOJA DE RECLAMACIÓN"), "0", 1, "C", true, 0, "")
			pdf.Ln(5)

			pdf.SetTextColor(0, 0, 0)
			pdf.SetFont("Arial", "B", 10)
			pdf.CellFormat(0, 5, tr("Código: ")+codigo, "0", 1, "R", false, 0, "")
			pdf.CellFormat(0, 5, "Fecha de Registro: "+fechaReg, "0", 1, "R", false, 0, "")
			pdf.Ln(5)

			// --- 1. PROVEEDOR ---
			pdf.SetFillColor(240, 240, 240)
			pdf.SetFont("Arial", "B", 11)
			pdf.CellFormat(0, 8, " 1. IDENTIFICACIÓN DEL PROVEEDOR", "1", 1, "L", true, 0, "")
			pdf.SetFont("Arial", "", 10)
			txtProv := fmt.Sprintf("Razón Social: %s\nRUC: %s\nSede: %s\nDirección: %s", rSoc, ruc, sedeNom, sedeDir)
			pdf.MultiCell(0, 6, tr(txtProv), "1", "L", false)
			pdf.Ln(4)

			// --- 2. CONSUMIDOR ---
			pdf.SetFont("Arial", "B", 11)
			pdf.CellFormat(0, 8, " 2. IDENTIFICACIÓN DEL CONSUMIDOR", "1", 1, "L", true, 0, "")
			pdf.SetFont("Arial", "", 10)
			txtCons := fmt.Sprintf("Nombre: %s\nDocumento: %s %s\nDirección: %s\nContacto: %s / %s",
				nombreCli, tDoc, nDoc, domicilioCli, telefonoCli, emailCli)
			pdf.MultiCell(0, 6, tr(txtCons), "1", "L", false)
			pdf.Ln(4)

			// --- 3. DETALLE ---
			pdf.SetFont("Arial", "B", 11)
			pdf.CellFormat(0, 8, " 3. DETALLE DEL RECLAMO / QUEJA", "1", 1, "L", true, 0, "")
			pdf.SetFont("Arial", "", 10)
			pdf.MultiCell(0, 6, tr("Detalle: "+detReclamo), "1", "L", false)
			pdf.MultiCell(0, 6, tr("Pedido: "+pedidoCli), "1", "L", false)
			pdf.Ln(4)

			// --- 4. RESOLUCIÓN ---
			pdf.SetFont("Arial", "B", 11)
			pdf.CellFormat(0, 8, tr(" 4. RESOLUCIÓN DE LA EMPRESA"), "1", 1, "L", true, 0, "")
			pdf.SetFont("Arial", "B", 10)
			pdf.CellFormat(0, 7, "Respuesta:", "LR", 1, "L", false, 0, "")
			pdf.SetFont("Arial", "", 10)
			pdf.MultiCell(0, 6, tr(respuestaTexto), "LRB", "L", false)

			if accionTomada != "" {
				pdf.SetFont("Arial", "B", 10)
				pdf.CellFormat(0, 7, tr("Acción adoptada:"), "LR", 1, "L", false, 0, "")
				pdf.SetFont("Arial", "", 10)
				pdf.MultiCell(0, 6, tr(accionTomada), "LRB", "L", false)
			}

			pdf.SetY(-35)
			pdf.SetFont("Arial", "I", 8)
			pdf.SetTextColor(100, 100, 100)
			pdf.MultiCell(0, 4, tr("Documento generado conforme a la Ley N° 29571. Codeplex SaaS."), "T", "C", false)

			var buf bytes.Buffer
			if err := pdf.Output(&buf); err != nil {
				fmt.Printf("[ERROR] PDF Output: %v\n", err)
				return
			}

			// Obtener tenant para Branding del email
			tenantObj, _ := s.tenantRepo.GetByTenantID(context.Background(), tenantID)
			if tenantObj == nil {
				tenantObj = &model.Tenant{RazonSocial: rSoc, ColorPrimario: "#1a56db", Slug: "portal"}
			}

			// Enviar email con PDF adjunto
			errEnvio := s.notifService.EnviarResolucionCliente(
				context.Background(),
				targetEmail,
				tenantObj,
				codigo,
				nombreCli,
				respuestaTexto,
				buf.Bytes(),
			)
			if errEnvio != nil {
				fmt.Printf("[ERROR SMTP Resolución] %v\n", errEnvio)
			}
		}()
	}

	return resp, nil
}
package service

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	"libro-reclamaciones/internal/model"

	"github.com/go-pdf/fpdf"
)

type ExportarPDFServicio struct{}

func NuevoExportarPDFServicio() *ExportarPDFServicio {
	return &ExportarPDFServicio{}
}

// GenerarReporteReclamos genera un PDF con la lista de reclamos del tenant.
func (s *ExportarPDFServicio) GenerarReporteReclamos(reclamos []model.Reclamo, nombreEmpresa, rucEmpresa string) ([]byte, error) {
	pdf := fpdf.New("L", "mm", "A4", "")
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	pdf.SetAutoPageBreak(true, 15)

	pdf.SetHeaderFunc(func() {
		s.dibujarEncabezado(pdf, tr, nombreEmpresa, rucEmpresa)
	})

	pdf.SetFooterFunc(func() {
		s.dibujarPiePagina(pdf, tr)
	})

	pdf.AddPage()
	s.dibujarTablaReclamos(pdf, tr, reclamos)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("exportar_pdf: error generando PDF: %w", err)
	}
	return buf.Bytes(), nil
}

func (s *ExportarPDFServicio) dibujarEncabezado(pdf *fpdf.Fpdf, tr func(string) string, empresa, ruc string) {
	pdf.SetY(10)

	// Título
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(26, 86, 219)
	pdf.CellFormat(0, 8, tr("Reporte de Reclamos y Quejas"), "", 1, "C", false, 0, "")

	// Empresa
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(100, 100, 100)
	subtitulo := empresa
	if ruc != "" {
		subtitulo += " | RUC: " + ruc
	}
	pdf.CellFormat(0, 5, tr(subtitulo), "", 1, "C", false, 0, "")

	// Línea separadora
	pdf.SetY(pdf.GetY() + 2)
	pdf.SetDrawColor(26, 86, 219)
	pdf.SetLineWidth(0.5)
	pdf.Line(10, pdf.GetY(), 287, pdf.GetY())
	pdf.SetY(pdf.GetY() + 4)
}

func (s *ExportarPDFServicio) dibujarPiePagina(pdf *fpdf.Fpdf, tr func(string) string) {
	pdf.SetY(-12)
	pdf.SetFont("Arial", "I", 7)
	pdf.SetTextColor(150, 150, 150)

	fechaGeneracion := time.Now().Format("02/01/2006 15:04")
	pdf.CellFormat(0, 5, tr(fmt.Sprintf("Generado el %s", fechaGeneracion)), "", 0, "L", false, 0, "")
	pdf.CellFormat(0, 5, fmt.Sprintf("Pag %d/{nb}", pdf.PageNo()), "", 0, "R", false, 0, "")
}

func (s *ExportarPDFServicio) dibujarTablaReclamos(pdf *fpdf.Fpdf, tr func(string) string, reclamos []model.Reclamo) {
	pdf.AliasNbPages("")

	// Columnas: Código, Consumidor, Documento, Tipo, Estado, Sede, Atendido por, Fecha, Monto
	anchos := []float64{30, 42, 28, 20, 22, 32, 35, 25, 23}
	encabezados := []string{"Codigo", "Consumidor", "Documento", "Tipo", "Estado", "Sede", "Atendido por", "Fecha", "Monto (S/)"}

	// Encabezado de tabla
	pdf.SetFont("Arial", "B", 8)
	pdf.SetFillColor(248, 250, 252)
	pdf.SetTextColor(71, 85, 105)
	pdf.SetDrawColor(226, 232, 240)

	for i, enc := range encabezados {
		pdf.CellFormat(anchos[i], 7, tr(enc), "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	// Filas de datos
	pdf.SetFont("Arial", "", 7.5)
	pdf.SetTextColor(55, 65, 81)
	alternar := false

	for _, rec := range reclamos {
		if alternar {
			pdf.SetFillColor(249, 250, 251)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}
		alternar = !alternar

		// Verificar salto de página
		if pdf.GetY()+7 > 195 {
			pdf.AddPage()
			// Re-dibujar encabezado de tabla
			pdf.SetFont("Arial", "B", 8)
			pdf.SetFillColor(248, 250, 252)
			pdf.SetTextColor(71, 85, 105)
			for i, enc := range encabezados {
				pdf.CellFormat(anchos[i], 7, tr(enc), "1", 0, "C", true, 0, "")
			}
			pdf.Ln(-1)
			pdf.SetFont("Arial", "", 7.5)
			pdf.SetTextColor(55, 65, 81)
		}

		sede := obtenerTextoNulo(rec.SedeNombre)
		if sede == "" {
			sede = "Principal"
		}
		monto := ""
		if rec.MontoReclamado.Valid && rec.MontoReclamado.Float64 > 0 {
			monto = fmt.Sprintf("%.2f", rec.MontoReclamado.Float64)
		}
		fecha := rec.FechaRegistro.Format("02/01/2006")
		estado := formatearEstadoPDF(rec.Estado)

		// Truncar nombre si es muy largo
		nombre := rec.NombreCompleto
		if len(nombre) > 28 {
			nombre = nombre[:28] + "..."
		}

		atendidoPor := rec.NombreAtendidoPor
		if atendidoPor == "" {
			atendidoPor = "-"
		}

		pdf.CellFormat(anchos[0], 7, tr(rec.CodigoReclamo), "1", 0, "L", true, 0, "")
		pdf.CellFormat(anchos[1], 7, tr(nombre), "1", 0, "L", true, 0, "")
		pdf.CellFormat(anchos[2], 7, tr(rec.NumeroDocumento), "1", 0, "C", true, 0, "")
		pdf.CellFormat(anchos[3], 7, tr(rec.TipoSolicitud), "1", 0, "C", true, 0, "")
		pdf.CellFormat(anchos[4], 7, tr(estado), "1", 0, "C", true, 0, "")
		pdf.CellFormat(anchos[5], 7, tr(truncar(sede, 18)), "1", 0, "L", true, 0, "")
		pdf.CellFormat(anchos[6], 7, tr(truncar(atendidoPor, 20)), "1", 0, "L", true, 0, "")
		pdf.CellFormat(anchos[7], 7, fecha, "1", 0, "C", true, 0, "")
		pdf.CellFormat(anchos[8], 7, monto, "1", 0, "R", true, 0, "")
		pdf.Ln(-1)
	}

	// Resumen
	pdf.SetY(pdf.GetY() + 6)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetTextColor(55, 65, 81)
	pdf.CellFormat(0, 6, tr(fmt.Sprintf("Total de registros: %d", len(reclamos))), "", 1, "L", false, 0, "")
}

func formatearEstadoPDF(estado string) string {
	return strings.ReplaceAll(estado, "_", " ")
}

func obtenerTextoNulo(ns model.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return ""
}

func truncar(texto string, max int) string {
	if len(texto) > max {
		return texto[:max] + "..."
	}
	return texto
}
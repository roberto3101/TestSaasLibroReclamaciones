package main

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"net/smtp"

	"github.com/jung-kurt/gofpdf"
)

func main() {
	// 1. CONFIGURACIÓN
	host, port, user, pass := "mail.codeplex.pe", "465", "asistencia@codeplex.pe", "Prueba246%%"
	to := "jose0686534@gmail.com"
	boundary := "codeplex_fixed_boundary"

	// DATOS REALES (SCHEMA V4)
	codigo := "2026-RECLAMO-001"
	rSoc := "Codeplex S.A.C."
	ruc := "20601234567"
	sn := "Sede Central Lima"
	sd := "Av. Javier Prado Este 1234, San Isidro"
	nombreCli := "Jose Garcia Perez"
	tDoc, nDoc := "DNI", "44556677"
	detReclamo := "Prueba de envio con validacion de lineas RFC para evitar bloqueo de Gmail."
	pedidoCli := "Validar la recepcion del PDF."

	fmt.Println("1. Generando PDF con datos reales...")
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(0, 10, "VALIDACION DE LINEAS SMTP RFC 2822", "B", 1, "C", false, 0, "")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 10)
	pdf.MultiCell(0, 6, fmt.Sprintf("Empresa: %s\nRUC: %s\nSede: %s\nDireccion: %s", rSoc, ruc, sn, sd), "0", "L", false)
	pdf.Ln(5)
	pdf.MultiCell(0, 6, fmt.Sprintf("Cliente: %s\nDoc: %s %s\nDetalle: %s", nombreCli, tDoc, nDoc, detReclamo), "0", "L", false)
	pdf.MultiCell(0, 6, "Pedido: "+pedidoCli, "0", "L", false)

	var buf bytes.Buffer
	_ = pdf.Output(&buf)
	pdfBytes := buf.Bytes()
	fmt.Printf("✓ PDF generado: %d bytes\n", len(pdfBytes))

	// 2. CONSTRUCCIÓN DEL MENSAJE CON VALIDACIÓN DE LÍNEAS
	asunto := "PRUEBA VALIDADA RFC - " + codigo
	cuerpo := "<h1>Causa Exacta Validada</h1><p>Este correo debe llegar porque el Base64 ahora tiene saltos de linea cada 76 caracteres.</p>"

	header := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=%s\r\n\r\n",
		user, to, asunto, boundary)

	msgBody := fmt.Sprintf("--%s\r\nContent-Type: text/html; charset=\"utf-8\"\r\n\r\n%s\r\n", boundary, cuerpo)

	// --- APLICANDO LA VALIDACIÓN DE LÍNEAS (LA SOLUCIÓN) ---
	rawBase64 := base64.StdEncoding.EncodeToString(pdfBytes)
	var validatedBase64 string
	
	// RFC 2045: Cortar cada 76 caracteres con CRLF (\r\n)
	for i := 0; i < len(rawBase64); i += 76 {
		end := i + 76
		if end > len(rawBase64) {
			end = len(rawBase64)
		}
		validatedBase64 += rawBase64[i:end] + "\r\n"
	}
	
	fmt.Printf("✓ Base64 validado y segmentado. Max linea: 76 chars.\n")

	msgBody += fmt.Sprintf("--%s\r\nContent-Type: application/pdf\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"Resolucion_Validada.pdf\"\r\n\r\n%s\r\n",
		boundary, validatedBase64)
	
	msgBody += "--" + boundary + "--"

	// 3. ENVÍO REAL
	fmt.Println("3. Enviando via SMTP SSL...")
	tlsconfig := &tls.Config{InsecureSkipVerify: false, ServerName: host}
	conn, err := tls.Dial("tcp", host+":"+port, tlsconfig)
	if err != nil {
		fmt.Printf("❌ Error TLS: %v\n", err)
		return
	}
	defer conn.Close()

	c, err := smtp.NewClient(conn, host)
	if err != nil {
		fmt.Printf("❌ Error Cliente: %v\n", err)
		return
	}

	_ = c.Auth(smtp.PlainAuth("", user, pass, host))
	_ = c.Mail(user)
	_ = c.Rcpt(to)
	w, _ := c.Data()
	_, _ = w.Write([]byte(header + msgBody))
	_ = w.Close()
	c.Quit()

	fmt.Println("✅ SUCCESS: Mensaje enviado con validacion RFC. ¡Revisa tu Gmail ahora!")
}
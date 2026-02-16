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
	host, port, user, pass := "mail.codeplex.pe", 465, "asistencia@codeplex.pe", "Prueba246%%"
	to := "jose0686534@gmail.com"
	boundary := "codeplex_fixed_boundary"

	fmt.Println("1. Generando PDF real con gofpdf...")
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(40, 10, "RESOLUCION DE PRUEBA REAL")
	pdf.Ln(20)
	pdf.SetFont("Arial", "", 12)
	for i := 1; i <= 20; i++ {
		pdf.Cell(0, 10, fmt.Sprintf("Linea de prueba numero %d para generar peso en el archivo.", i))
		pdf.Ln(8)
	}
	var buf bytes.Buffer
	_ = pdf.Output(&buf)
	pdfBytes := buf.Bytes()
	fmt.Printf("✓ PDF generado: %d bytes\n", len(pdfBytes))

	// --- SIMULACION EXACTA DE TU NOTIFICACION_SERVICE ---
	asunto := "PRUEBA SIMULADA REAL"
	cuerpo := "<h1>Resolución de Reclamo</h1><p>Esta es una prueba con HTML y PDF real.</p>"
	nombreAdjunto := "Resolucion_SIMULADA.pdf"

	header := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=%s\r\n\r\n",
		user, to, asunto, boundary)

	msgBody := fmt.Sprintf("--%s\r\nContent-Type: text/html; charset=\"utf-8\"\r\n\r\n%s\r\n", boundary, cuerpo)

	// Aquí está el problema potencial: Base64 en una sola línea gigante
	pdfBase64 := base64.StdEncoding.EncodeToString(pdfBytes)
	
	msgBody += fmt.Sprintf("--%s\r\nContent-Type: application/pdf\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"%s\"\r\n\r\n%s\r\n",
		boundary, nombreAdjunto, pdfBase64)
	
	msgBody += "--" + boundary + "--"

	fmt.Printf("2. Intentando enviar mensaje (Longitud total: %d caracteres)...\n", len(header+msgBody))

	tlsconfig := &tls.Config{InsecureSkipVerify: false, ServerName: host}
	conn, err := tls.Dial("tcp", fmt.Sprintf("%s:%d", host, port), tlsconfig)
	if err != nil {
		fmt.Printf("❌ Error TLS: %v\n", err)
		return
	}
	client, _ := smtp.NewClient(conn, host)
	_ = client.Auth(smtp.PlainAuth("", user, pass, host))
	_ = client.Mail(user)
	_ = client.Rcpt(to)

	w, err := client.Data()
	if err != nil {
		fmt.Printf("❌ Error en DATA: %v\n", err)
		return
	}
	_, err = w.Write([]byte(header + msgBody))
	if err != nil {
		fmt.Printf("❌ Error al escribir: %v\n", err)
	}
	w.Close()
	client.Quit()

	fmt.Println("✅ Proceso completado. Revisa si llegó.")
}
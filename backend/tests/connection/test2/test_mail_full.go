package main

import (
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"net/smtp"
)

func main() {
	host, port, user, pass := "mail.codeplex.pe", "465", "asistencia@codeplex.pe", "Prueba246%%"
	to := "jose0686534@gmail.com" 
	boundary := "debug_boundary_123"

	// 1. Conexión SSL
	conn, _ := tls.Dial("tcp", host+":"+port, &tls.Config{ServerName: host})
	client, _ := smtp.NewClient(conn, host)
	_ = client.Auth(smtp.PlainAuth("", user, pass, host))

	// 2. Construcción del Mensaje RAW (Inspeccionaremos esto)
	header := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: DEBUG PDF FULL\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=%s\r\n\r\n", user, to, boundary)
	body := fmt.Sprintf("--%s\r\nContent-Type: text/plain; charset=\"utf-8\"\r\n\r\nPrueba de envio con PDF adjunto.\r\n", boundary)
	
	// Simulamos un PDF pequeño de 10 bytes
	pdfSimulado := []byte{0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25}
	adjunto := fmt.Sprintf("--%s\r\nContent-Type: application/pdf\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"test.pdf\"\r\n\r\n%s\r\n", 
		boundary, base64.StdEncoding.EncodeToString(pdfSimulado))
	
	footer := "--" + boundary + "--" // ESTO ES LO QUE ESTA FALLANDO (Falta \r\n antes)

	rawMsg := header + body + adjunto + footer

	fmt.Println("--- RAW MESSAGE START ---")
	fmt.Println(rawMsg)
	fmt.Println("--- RAW MESSAGE END ---")

	// 3. Intento de Envío Real de DATA
	_ = client.Mail(user)
	_ = client.Rcpt(to)
	w, err := client.Data()
	if err != nil {
		fmt.Printf("❌ ERROR EN DATA: %v\n", err)
		return
	}
	_, err = w.Write([]byte(rawMsg))
	err = w.Close()
	if err != nil {
		fmt.Printf("❌ ERROR AL CERRAR DATA (RECHAZO DE SERVIDOR): %v\n", err)
	} else {
		fmt.Println("✅ Servidor SMTP aceptó el mensaje. Si no llega a Gmail, el error es el formato del RAW MESSAGE mostrado arriba.")
	}
	client.Quit()
}
package main

import (
	"bufio"
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/smtp"
	"strings"
	"time"
)

const (
	smtpHost = "mail.codeplex.pe"
	smtpUser = "asistencia@codeplex.pe"
	smtpPass = "Prueba246%%"
	emailTo  = "jose0686534@gmail.com"
)

func main() {
	log.Println("══════════════════════════════════════════════════")
	log.Println("  DIAGNÓSTICO PROFUNDO SMTP")
	log.Println("══════════════════════════════════════════════════")
	log.Println("")

	// ─── FASE 1: DNS y conectividad ───
	log.Println("── FASE 1: DNS / MX / Conectividad ──")

	ips, err := net.LookupHost(smtpHost)
	if err != nil {
		log.Printf("   ❌ DNS lookup falló: %v", err)
	} else {
		log.Printf("   ✅ %s resuelve a: %v", smtpHost, ips)
	}

	mxs, err := net.LookupMX("codeplex.pe")
	if err != nil {
		log.Printf("   ⚠️  No se encontraron registros MX para codeplex.pe: %v", err)
	} else {
		for _, mx := range mxs {
			log.Printf("   📧 MX: %s (prioridad %d)", mx.Host, mx.Pref)
		}
	}

	// SPF check
	txts, err := net.LookupTXT("codeplex.pe")
	if err == nil {
		for _, txt := range txts {
			if strings.Contains(txt, "spf") || strings.Contains(txt, "SPF") {
				log.Printf("   📋 SPF: %s", txt)
			}
		}
	}
	log.Println("")

	// ─── FASE 2: Conexión TLS raw + inspección EHLO ───
	log.Println("── FASE 2: Conexión TLS + EHLO (puerto 465) ──")
	testPort465()
	log.Println("")

	// ─── FASE 3: Probar puerto 587 con STARTTLS ───
	log.Println("── FASE 3: Puerto 587 con STARTTLS ──")
	testPort587()
	log.Println("")

	// ─── FASE 4: Envío real con lectura de respuesta del servidor ───
	log.Println("── FASE 4: Envío real con log de respuestas ──")
	testEnvioConLog()
	log.Println("")

	// ─── FASE 5: Envío directo al MX de Gmail ───
	log.Println("── FASE 5: Verificar si el servidor realmente envía ──")
	log.Println("   Para verificar, revisa los logs del servidor mail.codeplex.pe")
	log.Println("   o pregunta al proveedor de hosting si hay cola de correo retenida.")
	log.Println("")

	// ─── FASE 6: Test con From diferente ───
	log.Println("── FASE 6: Envío con headers mejorados (anti-spam) ──")
	testAntiSpam()
	log.Println("")

	log.Println("══════════════════════════════════════════════════")
	log.Println("  DIAGNÓSTICO COMPLETADO")
	log.Println("══════════════════════════════════════════════════")
}

func testPort465() {
	addr := smtpHost + ":465"
	log.Printf("   Conectando a %s (TLS directo)...", addr)

	tlsconfig := &tls.Config{
		ServerName: smtpHost,
	}

	conn, err := tls.Dial("tcp", addr, tlsconfig)
	if err != nil {
		log.Printf("   ❌ TLS dial falló: %v", err)
		return
	}
	defer conn.Close()

	log.Printf("   ✅ TLS conectado. Cipher: %s", tls.CipherSuiteName(conn.ConnectionState().CipherSuite))
	log.Printf("   ✅ TLS version: %d", conn.ConnectionState().Version)

	// Leer greeting
	reader := bufio.NewReader(conn)
	greeting, err := reader.ReadString('\n')
	if err != nil {
		log.Printf("   ❌ No se recibió greeting: %v", err)
		return
	}
	log.Printf("   📨 Greeting: %s", strings.TrimSpace(greeting))

	// Enviar EHLO
	fmt.Fprintf(conn, "EHLO codeplex.pe\r\n")
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			break
		}
		line = strings.TrimSpace(line)
		log.Printf("   📨 EHLO: %s", line)
		// Si la línea empieza con "250 " (espacio, no guión), es la última
		if len(line) >= 4 && line[3] == ' ' {
			break
		}
	}

	// Enviar QUIT
	fmt.Fprintf(conn, "QUIT\r\n")
}

func testPort587() {
	addr := smtpHost + ":587"
	log.Printf("   Conectando a %s (STARTTLS)...", addr)

	conn, err := net.DialTimeout("tcp", addr, 10*time.Second)
	if err != nil {
		log.Printf("   ❌ Puerto 587 no disponible: %v", err)
		log.Println("   ℹ️  Esto es normal si el hosting solo usa 465.")
		return
	}
	defer conn.Close()
	log.Printf("   ✅ Puerto 587 abierto")

	reader := bufio.NewReader(conn)
	greeting, _ := reader.ReadString('\n')
	log.Printf("   📨 Greeting: %s", strings.TrimSpace(greeting))

	fmt.Fprintf(conn, "EHLO codeplex.pe\r\n")
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			break
		}
		line = strings.TrimSpace(line)
		log.Printf("   📨 EHLO: %s", line)
		if strings.Contains(line, "STARTTLS") {
			log.Println("   ✅ Servidor soporta STARTTLS en 587")
		}
		if len(line) >= 4 && line[3] == ' ' {
			break
		}
	}

	fmt.Fprintf(conn, "QUIT\r\n")
}

func testEnvioConLog() {
	addr := smtpHost + ":465"
	log.Printf("   Enviando correo de prueba con log detallado...")

	tlsconfig := &tls.Config{
		ServerName: smtpHost,
	}

	conn, err := tls.Dial("tcp", addr, tlsconfig)
	if err != nil {
		log.Printf("   ❌ Conexión: %v", err)
		return
	}
	defer conn.Close()

	c, err := smtp.NewClient(conn, smtpHost)
	if err != nil {
		log.Printf("   ❌ Cliente SMTP: %v", err)
		return
	}
	defer c.Quit()

	// Auth
	err = c.Auth(smtp.PlainAuth("", smtpUser, smtpPass, smtpHost))
	if err != nil {
		log.Printf("   ❌ AUTH: %v", err)
		return
	}
	log.Println("   ✅ AUTH OK")

	// MAIL FROM
	err = c.Mail(smtpUser)
	if err != nil {
		log.Printf("   ❌ MAIL FROM: %v", err)
		return
	}
	log.Println("   ✅ MAIL FROM OK")

	// RCPT TO
	err = c.Rcpt(emailTo)
	if err != nil {
		log.Printf("   ❌ RCPT TO: %v (¡POSIBLE BLOQUEO!)", err)
		return
	}
	log.Println("   ✅ RCPT TO OK")

	// DATA
	w, err := c.Data()
	if err != nil {
		log.Printf("   ❌ DATA: %v", err)
		return
	}

	// Mensaje con headers anti-spam mejorados
	msg := "From: Codeplex Asistencia <" + smtpUser + ">\r\n" +
		"To: " + emailTo + "\r\n" +
		"Subject: =?UTF-8?B?VGVzdCBGYXNlIDQgLSBEaWFnbsOzc3RpY28=?=\r\n" +
		"Date: " + time.Now().Format(time.RFC1123Z) + "\r\n" +
		"Message-ID: <diag4-" + fmt.Sprintf("%d", time.Now().UnixNano()) + "@codeplex.pe>\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/plain; charset=\"UTF-8\"\r\n" +
		"Content-Transfer-Encoding: 7bit\r\n" +
		"X-Mailer: Codeplex-Go/1.0\r\n" +
		"\r\n" +
		"Este es un correo de diagnostico de Codeplex.\r\n" +
		"Si recibes este mensaje, la entrega funciona.\r\n" +
		"Timestamp: " + time.Now().Format(time.RFC3339) + "\r\n"

	n, err := w.Write([]byte(msg))
	if err != nil {
		log.Printf("   ❌ WRITE: %v (bytes: %d)", err, n)
		return
	}
	log.Printf("   ✅ WRITE OK (%d bytes)", n)

	err = w.Close()
	if err != nil {
		log.Printf("   ❌ CLOSE: %v ← SERVIDOR RECHAZÓ EL MENSAJE", err)
		return
	}
	log.Println("   ✅ CLOSE OK — Servidor aceptó el mensaje")

	// Verificar con NOOP si la conexión sigue viva
	err = c.Noop()
	if err != nil {
		log.Printf("   ⚠️  NOOP falló (conexión puede estar cerrada): %v", err)
	} else {
		log.Println("   ✅ Conexión sigue activa después del envío")
	}
}

func testAntiSpam() {
	addr := smtpHost + ":465"
	log.Println("   Enviando con headers anti-spam completos...")

	tlsconfig := &tls.Config{
		ServerName: smtpHost,
	}

	conn, err := tls.Dial("tcp", addr, tlsconfig)
	if err != nil {
		log.Printf("   ❌ Conexión: %v", err)
		return
	}
	defer conn.Close()

	c, err := smtp.NewClient(conn, smtpHost)
	if err != nil {
		log.Printf("   ❌ Cliente: %v", err)
		return
	}
	defer c.Quit()

	if err = c.Auth(smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)); err != nil {
		log.Printf("   ❌ AUTH: %v", err)
		return
	}
	if err = c.Mail(smtpUser); err != nil {
		log.Printf("   ❌ MAIL FROM: %v", err)
		return
	}
	if err = c.Rcpt(emailTo); err != nil {
		log.Printf("   ❌ RCPT TO: %v", err)
		return
	}

	w, err := c.Data()
	if err != nil {
		log.Printf("   ❌ DATA: %v", err)
		return
	}

	// Headers completos para máxima entregabilidad
	now := time.Now()
	msgID := fmt.Sprintf("<%d.antispam@codeplex.pe>", now.UnixNano())

	var msg strings.Builder
	msg.WriteString("From: \"Libro de Reclamaciones\" <" + smtpUser + ">\r\n")
	msg.WriteString("Reply-To: " + smtpUser + "\r\n")
	msg.WriteString("To: " + emailTo + "\r\n")
	msg.WriteString("Subject: Notificacion importante - Libro de Reclamaciones\r\n")
	msg.WriteString("Date: " + now.Format(time.RFC1123Z) + "\r\n")
	msg.WriteString("Message-ID: " + msgID + "\r\n")
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	msg.WriteString("Content-Transfer-Encoding: 7bit\r\n")
	msg.WriteString("X-Mailer: Codeplex-LibroReclamaciones/1.0\r\n")
	msg.WriteString("X-Priority: 3\r\n")
	msg.WriteString("Importance: Normal\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(`<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
<p>Hola,</p>
<p>Este es un correo de prueba del sistema de Libro de Reclamaciones.</p>
<p>Si recibes este mensaje, la entrega de correos funciona correctamente.</p>
<p><strong>Timestamp:</strong> ` + now.Format(time.RFC3339) + `</p>
<hr>
<p style="color: #999; font-size: 12px;">Codeplex Software S.A.C.</p>
</body>
</html>`)

	n, err := w.Write([]byte(msg.String()))
	if err != nil {
		log.Printf("   ❌ WRITE: %v", err)
		return
	}
	log.Printf("   ✅ WRITE OK (%d bytes)", n)

	err = w.Close()
	if err != nil {
		log.Printf("   ❌ CLOSE: %v ← RECHAZADO", err)
		return
	}
	log.Println("   ✅ CLOSE OK — Mensaje aceptado")
	log.Println("")
	log.Println("   ════════════════════════════════════════════")
	log.Println("   Si este correo tampoco llega, el problema es:")
	log.Println("   1. El servidor mail.codeplex.pe ACEPTA pero NO ENTREGA")
	log.Println("   2. Revisa: cPanel → Email Deliverability")
	log.Println("   3. Revisa: cPanel → Track Delivery (Mail Queue)")
	log.Println("   4. Posible: IP del servidor en blacklist")
	log.Println("   5. Posible: SPF/DKIM/DMARC mal configurados")
	log.Println("   ════════════════════════════════════════════")
}
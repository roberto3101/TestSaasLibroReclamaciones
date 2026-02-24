package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"libro-reclamaciones/internal/config"
	"libro-reclamaciones/internal/service"

	"github.com/gin-gonic/gin"
)

// WhatsAppController maneja el webhook de WhatsApp Business Cloud API.
type WhatsAppController struct {
	configuracion   config.WhatsAppConfig
	whatsappService *service.WhatsAppService
}

func NewWhatsAppController(
	configuracion config.WhatsAppConfig,
	whatsappService *service.WhatsAppService,
) *WhatsAppController {
	return &WhatsAppController{
		configuracion:   configuracion,
		whatsappService: whatsappService,
	}
}

// ── Structs del payload de Meta ─────────────────────────────────────────────

type payloadWebhookMeta struct {
	Object string           `json:"object"`
	Entry  []entradaWebhook `json:"entry"`
}

type entradaWebhook struct {
	ID      string          `json:"id"`
	Changes []cambioWebhook `json:"changes"`
}

type cambioWebhook struct {
	Value valorCambio `json:"value"`
	Field string      `json:"field"`
}

type valorCambio struct {
	MessagingProduct string            `json:"messaging_product"`
	Metadata         metadataTelefono  `json:"metadata"`
	Messages         []mensajeEntrante `json:"messages"`
	Statuses         []interface{}     `json:"statuses"`
}

type metadataTelefono struct {
	DisplayPhoneNumber string `json:"display_phone_number"`
	PhoneNumberID      string `json:"phone_number_id"`
}

type mensajeEntrante struct {
	From      string        `json:"from"`
	ID        string        `json:"id"`
	Timestamp string        `json:"timestamp"`
	Type      string        `json:"type"`
	Text      *textoMensaje `json:"text,omitempty"`
}

type textoMensaje struct {
	Body string `json:"body"`
}

// ── GET /webhook/whatsapp — Verificación del webhook por Meta ───────────────

func (ctrl *WhatsAppController) VerificarWebhook(c *gin.Context) {
	modo := c.Query("hub.mode")
	token := c.Query("hub.verify_token")
	desafio := c.Query("hub.challenge")

	if modo == "subscribe" && token == ctrl.configuracion.VerifyToken {
		fmt.Println("[WhatsApp] Webhook verificado con token global")
		c.String(http.StatusOK, desafio)
		return
	}

	fmt.Printf("[WhatsApp] Verificación fallida — modo=%s token=%s\n", modo, token)
	c.String(http.StatusForbidden, "Forbidden")
}

// ── POST /webhook/whatsapp — Recepción de mensajes entrantes ────────────────

func (ctrl *WhatsAppController) RecibirMensajeEntrante(c *gin.Context) {
	defer c.JSON(http.StatusOK, gin.H{"status": "ok"})

	cuerpo, err := io.ReadAll(c.Request.Body)
	if err != nil {
		fmt.Printf("[WhatsApp] Error leyendo body: %v\n", err)
		return
	}

	var payload payloadWebhookMeta
	if err := json.Unmarshal(cuerpo, &payload); err != nil {
		fmt.Printf("[WhatsApp] Error parseando JSON: %v\n", err)
		return
	}

	for _, entrada := range payload.Entry {
		for _, cambio := range entrada.Changes {
			if len(cambio.Value.Messages) == 0 {
				continue
			}

			phoneNumberID := cambio.Value.Metadata.PhoneNumberID

			// ── RESOLUCIÓN DINÁMICA DEL TENANT ──
			ctx, cancelar := context.WithTimeout(context.Background(), 5*time.Second)
			canalResuelto, err := ctrl.whatsappService.ResolverCanalPorPhoneNumberID(ctx, phoneNumberID)
			cancelar()

			if err != nil {
				fmt.Printf("[WhatsApp] Error resolviendo canal para phone_number_id=%s: %v\n", phoneNumberID, err)
				continue
			}

			if canalResuelto == nil {
				fmt.Printf("[WhatsApp] No hay canal registrado para phone_number_id=%s — ignorando mensaje\n", phoneNumberID)
				continue
			}

			fmt.Printf("[WhatsApp] Canal resuelto → tenant=%s phone=%s chatbot=%v\n",
				canalResuelto.TenantID, canalResuelto.PhoneID, canalResuelto.ChatbotID)

			// ── PROCESAR CADA MENSAJE ──
			for _, mensaje := range cambio.Value.Messages {
				if mensaje.Type != "text" || mensaje.Text == nil {
					ctrl.enviarMensajeDeTexto(
						canalResuelto.PhoneID, canalResuelto.AccessToken,
						mensaje.From,
						"Por ahora solo puedo procesar mensajes de texto. "+
							"Envíame tu consulta escrita y te ayudaré. 📝",
					)
					continue
				}

				fmt.Printf("[WhatsApp] Mensaje de %s: %s\n", mensaje.From, mensaje.Text.Body)

				// ── PROCESAR CON IA + MEMORIA (timeout largo para IA) ──
				ctx, cancelar := context.WithTimeout(context.Background(), 30*time.Second)
				respuesta := ctrl.whatsappService.ProcesarMensaje(
					ctx,
					canalResuelto, // ahora pasa el canal completo (incluye ChatbotID)
					mensaje.From,
					mensaje.Text.Body,
				)
				cancelar()

				if respuesta != "" {
					ctrl.enviarMensajeDeTexto(
						canalResuelto.PhoneID, canalResuelto.AccessToken,
						mensaje.From, respuesta,
					)
				}
			}
		}
	}
}

// ── Envío de mensaje vía WhatsApp Cloud API ─────────────────────────────────

func (ctrl *WhatsAppController) enviarMensajeDeTexto(phoneID, accessToken, destinatario, texto string) {
	urlAPI := fmt.Sprintf("https://graph.facebook.com/v22.0/%s/messages", phoneID)

	cuerpoJSON := map[string]interface{}{
		"messaging_product": "whatsapp",
		"to":                destinatario,
		"type":              "text",
		"text": map[string]string{
			"body": texto,
		},
	}

	datosJSON, err := json.Marshal(cuerpoJSON)
	if err != nil {
		fmt.Printf("[WhatsApp] Error serializando payload: %v\n", err)
		return
	}

	peticion, err := http.NewRequest("POST", urlAPI, bytes.NewBuffer(datosJSON))
	if err != nil {
		fmt.Printf("[WhatsApp] Error creando request: %v\n", err)
		return
	}

	peticion.Header.Set("Content-Type", "application/json")
	peticion.Header.Set("Authorization", "Bearer "+accessToken)

	cliente := &http.Client{Timeout: 15 * time.Second}
	respuesta, err := cliente.Do(peticion)
	if err != nil {
		fmt.Printf("[WhatsApp] Error enviando mensaje a %s: %v\n", destinatario, err)
		return
	}
	defer respuesta.Body.Close()

	if respuesta.StatusCode != http.StatusOK {
		cuerpoRespuesta, _ := io.ReadAll(respuesta.Body)
		fmt.Printf("[WhatsApp] Meta respondió %d: %s\n", respuesta.StatusCode, string(cuerpoRespuesta))
		return
	}

	fmt.Printf("[WhatsApp] Mensaje enviado a %s\n", destinatario)
}
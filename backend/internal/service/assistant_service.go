package service

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"libro-reclamaciones/internal/ai"
	"libro-reclamaciones/internal/repo"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────────────────────────────────────
// AssistantService — Lógica de negocio del asistente IA interno.
// ──────────────────────────────────────────────────────────────────────────────

type AssistantService struct {
	aiProvider    ai.Provider
	assistantRepo *repo.AssistantRepo
	historialRepo *repo.AsistenteHistorialRepo
	tenantRepo    *repo.TenantRepo
}

func NewAssistantService(
	aiProvider ai.Provider,
	assistantRepo *repo.AssistantRepo,
	historialRepo *repo.AsistenteHistorialRepo,
	tenantRepo *repo.TenantRepo,
) *AssistantService {
	return &AssistantService{
		aiProvider:    aiProvider,
		assistantRepo: assistantRepo,
		historialRepo: historialRepo,
		tenantRepo:    tenantRepo,
	}
}

// ChatMessage representa un mensaje en la conversación del asistente.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatResult es la respuesta del asistente.
type ChatResult struct {
	Response       string `json:"response"`
	PromptTokens   int    `json:"prompt_tokens"`
	OutputTokens   int    `json:"output_tokens"`
	Provider       string `json:"provider"`
	ConversacionID string `json:"conversacion_id"`
}

// ──────────────────────────────────────────────────────────────────────────────
// Chat
// ──────────────────────────────────────────────────────────────────────────────

func (s *AssistantService) Chat(ctx context.Context, tenantID, usuarioID uuid.UUID, conversacionID uuid.UUID, userMessage string) (*ChatResult, error) {
	// 1. Si no hay conversación, crear una nueva
	if conversacionID == uuid.Nil {
		titulo := userMessage
		if len(titulo) > 80 {
			titulo = titulo[:80]
		}
		newID, err := s.historialRepo.CrearConversacion(ctx, tenantID, usuarioID, titulo)
		if err != nil {
			return nil, fmt.Errorf("assistant_service.Chat crear conversacion: %w", err)
		}
		conversacionID = newID
	} else {
		ok, err := s.historialRepo.VerificarConversacionDelUsuario(ctx, tenantID, usuarioID, conversacionID)
		if err != nil {
			return nil, fmt.Errorf("assistant_service.Chat verificar: %w", err)
		}
		if !ok {
			return nil, fmt.Errorf("conversacion_no_encontrada")
		}
	}

	// 2. Guardar mensaje del usuario en BD
	if err := s.historialRepo.GuardarMensajeUsuario(ctx, tenantID, conversacionID, userMessage); err != nil {
		if err.Error() == "limite_mensajes_alcanzado" {
			return nil, fmt.Errorf("Esta conversación alcanzó el límite de 50 mensajes. Crea una nueva conversación.")
		}
		return nil, fmt.Errorf("assistant_service.Chat guardar usuario: %w", err)
	}

	// 3. Cargar historial completo de la conversación desde BD
	mensajesDB, err := s.historialRepo.ListarMensajes(ctx, tenantID, conversacionID)
	if err != nil {
		return nil, fmt.Errorf("assistant_service.Chat cargar historial: %w", err)
	}

	// 4. Convertir a formato del gateway de IA (últimos 10 para no saturar)
	var messages []ai.Message
	inicio := 0
	if len(mensajesDB) > 10 {
		inicio = len(mensajesDB) - 10
	}
	for _, m := range mensajesDB[inicio:] {
		role := "user"
		if m.Rol == "ASSISTANT" {
			role = "assistant"
		}
		messages = append(messages, ai.Message{Role: role, Content: m.Contenido})
	}

	// 5. Construir contexto del tenant
	tenantContext, err := s.buildTenantContext(ctx, tenantID)
	if err != nil {
		fmt.Printf("[WARN] buildTenantContext falló: %v\n", err)
		tenantContext = "[No se pudo cargar contexto del tenant]"
	}

	// DEBUG: imprimir el contexto completo para verificar que tiene los datos
	fmt.Printf("[DEBUG] Contexto del tenant (%d chars):\n%s\n", len(tenantContext), tenantContext)

	systemPrompt := s.buildSystemPrompt(tenantContext)

	// 6. Llamar al proveedor de IA
	inicio_ia := time.Now()
	resp, err := s.aiProvider.Chat(ctx, ai.ChatRequest{
		SystemPrompt: systemPrompt,
		Messages:     messages,
		MaxTokens:    4096,
	})
	duracionMs := int(time.Since(inicio_ia).Milliseconds())

	if err != nil {
		return nil, fmt.Errorf("assistant_service.Chat IA: %w", err)
	}

	// 7. Guardar respuesta de la IA en BD
	_ = s.historialRepo.GuardarMensajeAsistente(
		ctx, tenantID, conversacionID,
		resp.Content, resp.PromptTokens, resp.OutputTokens,
		duracionMs, resp.Provider,
	)

	return &ChatResult{
		Response:       resp.Content,
		PromptTokens:   resp.PromptTokens,
		OutputTokens:   resp.OutputTokens,
		Provider:       resp.Provider,
		ConversacionID: conversacionID.String(),
	}, nil
}

// ──────────────────────────────────────────────────────────────────────────────
// Gestión de conversaciones
// ──────────────────────────────────────────────────────────────────────────────

func (s *AssistantService) ListarConversaciones(ctx context.Context, tenantID, usuarioID uuid.UUID) ([]repo.ConversacionResumen, error) {
	return s.historialRepo.ListarConversaciones(ctx, tenantID, usuarioID)
}

func (s *AssistantService) ObtenerMensajes(ctx context.Context, tenantID, usuarioID, conversacionID uuid.UUID) ([]repo.MensajeHistorial, error) {
	ok, err := s.historialRepo.VerificarConversacionDelUsuario(ctx, tenantID, usuarioID, conversacionID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, fmt.Errorf("conversacion_no_encontrada")
	}
	return s.historialRepo.ListarMensajes(ctx, tenantID, conversacionID)
}

func (s *AssistantService) EliminarConversacion(ctx context.Context, tenantID, usuarioID, conversacionID uuid.UUID) error {
	return s.historialRepo.EliminarConversacion(ctx, tenantID, usuarioID, conversacionID)
}

// ──────────────────────────────────────────────────────────────────────────────
// Contexto del tenant — CON LOGS DE DEBUG PARA DIAGNOSTICAR
// ──────────────────────────────────────────────────────────────────────────────

func (s *AssistantService) buildTenantContext(ctx context.Context, tenantID uuid.UUID) (string, error) {
	var parts []string

	// Info del tenant
	tenant, err := s.tenantRepo.GetByTenantID(ctx, tenantID)
	if err != nil {
		fmt.Printf("[ERROR] tenantRepo.GetByTenantID: %v\n", err)
	} else if tenant != nil {
		parts = append(parts, fmt.Sprintf("Empresa: %s (RUC: %s)", tenant.RazonSocial, tenant.RUC))
	}

	// Estadísticas generales
	stats, err := s.assistantRepo.GetEstadisticas(ctx, tenantID)
	if err != nil {
		fmt.Printf("[ERROR] GetEstadisticas: %v\n", err)
	} else {
		parts = append(parts, fmt.Sprintf(
			"ESTADÍSTICAS DE RECLAMOS:\n"+
				"  - Total: %d\n"+
				"  - Pendientes: %d\n"+
				"  - En proceso: %d\n"+
				"  - Resueltos: %d\n"+
				"  - Cerrados: %d\n"+
				"  - Rechazados: %d\n"+
				"  - VENCIDOS (pasaron fecha límite): %d",
			stats.Total, stats.Pendientes, stats.EnProceso,
			stats.Resueltos, stats.Cerrados, stats.Rechazados, stats.Vencidos,
		))
	}

	// TODOS los reclamos PENDIENTES (hasta 30)
	pendientes, err := s.assistantRepo.GetReclamosPorEstado(ctx, tenantID, "PENDIENTE", 30)
	if err != nil {
		fmt.Printf("[ERROR] GetReclamosPorEstado PENDIENTE: %v\n", err)
	} else {
		fmt.Printf("[DEBUG] Pendientes encontrados: %d\n", len(pendientes))
		if len(pendientes) > 0 {
			parts = append(parts, "DETALLE DE RECLAMOS PENDIENTES ("+fmt.Sprintf("%d", len(pendientes))+" reclamos):\n"+s.formatReclamosDetallado(pendientes))
		}
	}

	// TODOS los reclamos EN_PROCESO (hasta 30)
	enProceso, err := s.assistantRepo.GetReclamosPorEstado(ctx, tenantID, "EN_PROCESO", 30)
	if err != nil {
		fmt.Printf("[ERROR] GetReclamosPorEstado EN_PROCESO: %v\n", err)
	} else {
		fmt.Printf("[DEBUG] En proceso encontrados: %d\n", len(enProceso))
		if len(enProceso) > 0 {
			parts = append(parts, "DETALLE DE RECLAMOS EN PROCESO ("+fmt.Sprintf("%d", len(enProceso))+" reclamos):\n"+s.formatReclamosDetallado(enProceso))
		}
	}

	// Últimos resueltos (5)
	resueltos, err := s.assistantRepo.GetReclamosPorEstado(ctx, tenantID, "RESUELTO", 5)
	if err != nil {
		fmt.Printf("[ERROR] GetReclamosPorEstado RESUELTO: %v\n", err)
	} else if len(resueltos) > 0 {
		parts = append(parts, "ÚLTIMOS RECLAMOS RESUELTOS:\n"+s.formatReclamosCorto(resueltos))
	}

	// Últimos rechazados (5)
	rechazados, err := s.assistantRepo.GetReclamosPorEstado(ctx, tenantID, "RECHAZADO", 5)
	if err != nil {
		fmt.Printf("[ERROR] GetReclamosPorEstado RECHAZADO: %v\n", err)
	} else if len(rechazados) > 0 {
		parts = append(parts, "ÚLTIMOS RECLAMOS RECHAZADOS:\n"+s.formatReclamosCorto(rechazados))
	}

	parts = append(parts, fmt.Sprintf("Fecha actual: %s", time.Now().Format("2006-01-02 15:04")))

	return strings.Join(parts, "\n\n"), nil
}

// formatReclamosDetallado muestra cada reclamo con toda la info útil.
func (s *AssistantService) formatReclamosDetallado(reclamos []repo.ReclamoResumen) string {
	var lines []string
	for _, r := range reclamos {
		urgencia := s.calcularUrgencia(r)
		sede := ""
		if r.SedeNombre.Valid {
			sede = " | Sede: " + r.SedeNombre.String
		}
		lines = append(lines, fmt.Sprintf(
			"  [%s] %s | %s | %s | %s | Tel: %s%s\n"+
				"    Bien: %s\n"+
				"    Detalle: %s\n"+
				"    Pedido: %s\n"+
				"    Registrado: %s | Límite: %s | %s",
			r.CodigoReclamo, r.TipoSolicitud, urgencia,
			r.NombreCompleto, r.Email, r.Telefono, sede,
			r.DetalleBien,
			r.DetalleCorto,
			r.PedidoConsumidor,
			r.FechaRegistro.Format("2006-01-02"),
			s.formatFechaLimite(r.FechaLimite),
			s.calcularDiasTexto(r.DiasRestantes),
		))
	}
	return strings.Join(lines, "\n\n")
}

// formatReclamosCorto muestra un resumen de una línea por reclamo.
func (s *AssistantService) formatReclamosCorto(reclamos []repo.ReclamoResumen) string {
	var lines []string
	for _, r := range reclamos {
		lines = append(lines, fmt.Sprintf(
			"  - %s | %s | %s | %s | %s",
			r.CodigoReclamo, r.Estado, r.NombreCompleto,
			r.FechaRegistro.Format("2006-01-02"), r.DetalleCorto,
		))
	}
	return strings.Join(lines, "\n")
}

func (s *AssistantService) calcularUrgencia(r repo.ReclamoResumen) string {
	if r.DiasRestantes < 0 {
		return fmt.Sprintf("¡¡VENCIDO hace %d días!!", -r.DiasRestantes)
	}
	if r.DiasRestantes <= 3 {
		return fmt.Sprintf("CRITICO: %d días", r.DiasRestantes)
	}
	if r.DiasRestantes <= 7 {
		return fmt.Sprintf("URGENTE: %d días", r.DiasRestantes)
	}
	return fmt.Sprintf("%d días restantes", r.DiasRestantes)
}

func (s *AssistantService) formatFechaLimite(fl sql.NullTime) string {
	if !fl.Valid {
		return "Sin fecha límite"
	}
	return fl.Time.Format("2006-01-02")
}

func (s *AssistantService) calcularDiasTexto(dias int) string {
	if dias < 0 {
		return fmt.Sprintf("VENCIDO hace %d días", -dias)
	}
	if dias == 0 {
		return "VENCE HOY"
	}
	return fmt.Sprintf("%d días restantes", dias)
}

func (s *AssistantService) buildSystemPrompt(tenantContext string) string {
	return fmt.Sprintf(`Eres el asistente interno de IA para gestión del Libro de Reclamaciones digital. Respondes en español.

REGLA ABSOLUTA: Usa SOLO los datos de la sección DATOS ACTUALES DEL TENANT.
Si un dato no aparece ahí, responde "No tengo esa información disponible."
NUNCA inventes datos.

DATOS ACTUALES DEL TENANT:
%s

INSTRUCCIONES:
- SIEMPRE formatea tus respuestas en Markdown: usa **negritas** para códigos y campos clave, ## para títulos de sección, y listas numeradas (1. 2. 3.) para enumerar reclamos
- Cuando listes reclamos, presenta cada uno con campos separados en líneas: **Código**, **Cliente**, **Email**, **Bien**, **Detalle**, **Pedido**, **Días restantes**
- Copia TEXTUALMENTE los códigos, nombres y detalles que aparecen en los datos
- Si un reclamo dice VENCIDO o CRITICO, destácalo con **VENCIDO** o **CRÍTICO** en negritas
- Puedes asesorar sobre normativa INDECOPI (plazo 30 días, multas hasta 450 UIT)
- Puedes redactar respuestas profesionales usando el detalle y pedido del consumidor como base`, tenantContext)
}
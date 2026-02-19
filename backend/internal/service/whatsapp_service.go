package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"libro-reclamaciones/internal/ai"
	"libro-reclamaciones/internal/model/dto"
	"libro-reclamaciones/internal/repo"

	"github.com/google/uuid"
)

// WhatsAppService lógica de negocio del bot conversacional de WhatsApp.
// Usa IA acotada al dominio de reclamos para entender lenguaje natural.
// Mantiene memoria de conversación por usuario (TTL 15 minutos).
// Cuando el usuario confirma los datos, registra el reclamo REAL en BD y envía correo.
type WhatsAppService struct {
	reclamoService *ReclamoService
	tenantRepo     *repo.TenantRepo
	canalWARepo    *repo.CanalWhatsAppRepo
	iaProvider     ai.Provider

	// ── Memoria de conversación por teléfono ──
	conversaciones   map[string]*conversacionWA
	muConversaciones sync.RWMutex
}

// conversacionWA almacena el historial de mensajes de un usuario.
type conversacionWA struct {
	mensajes        []ai.Message
	ultimaActividad time.Time
	tenantID        uuid.UUID
}

const (
	ttlConversacion     = 15 * time.Minute
	maxMensajesPorConvo = 20

	// Marcador que la IA usa cuando tiene todos los datos confirmados
	marcadorRegistro = ">>>REGISTRAR_RECLAMO:"
	marcadorFin      = "<<<"
)

// datosReclamoWhatsApp estructura que la IA genera en JSON cuando el usuario confirma.
type datosReclamoWhatsApp struct {
	NombreCompleto  string `json:"nombre_completo"`
	TipoDocumento   string `json:"tipo_documento"`
	NumeroDocumento string `json:"numero_documento"`
	Email           string `json:"email"`
	Telefono        string `json:"telefono"`
	Descripcion     string `json:"descripcion"`
}

func NewWhatsAppService(
	reclamoService *ReclamoService,
	tenantRepo *repo.TenantRepo,
	canalWARepo *repo.CanalWhatsAppRepo,
	iaProvider ai.Provider,
) *WhatsAppService {
	svc := &WhatsAppService{
		reclamoService: reclamoService,
		tenantRepo:     tenantRepo,
		canalWARepo:    canalWARepo,
		iaProvider:     iaProvider,
		conversaciones: make(map[string]*conversacionWA),
	}

	go svc.limpiarConversacionesExpiradas()

	return svc
}

// ── Resolución dinámica del tenant ──────────────────────────────────────────

type CanalResuelto struct {
	TenantID    uuid.UUID
	AccessToken string
	PhoneID     string
}

func (s *WhatsAppService) ResolverCanalPorPhoneNumberID(ctx context.Context, phoneNumberID string) (*CanalResuelto, error) {
	canal, err := s.canalWARepo.GetByPhoneNumberID(ctx, phoneNumberID)
	if err != nil {
		return nil, fmt.Errorf("whatsapp_service.ResolverCanal: %w", err)
	}
	if canal == nil {
		return nil, nil
	}

	return &CanalResuelto{
		TenantID:    canal.TenantID,
		AccessToken: canal.AccessToken,
		PhoneID:     canal.PhoneNumberID,
	}, nil
}

// ── Flujo principal con IA + memoria + registro real ────────────────────────

func (s *WhatsAppService) ProcesarMensaje(ctx context.Context, tenantID uuid.UUID, telefono, textoUsuario string) string {
	textoLimpio := strings.TrimSpace(textoUsuario)

	// ── Validación: mensaje demasiado largo ──
	if len([]rune(textoLimpio)) > 700 {
		return "Tu mensaje es demasiado largo. Por favor, sé más breve (máximo 700 caracteres). 📝"
	}

	// ── Caso determinista: código de reclamo → buscar directo sin IA ──
	if textoPareceCodigo(textoLimpio) {
		respuesta := s.buscarReclamoEnBaseDeDatosYFormatear(ctx, tenantID, textoLimpio)
		s.agregarMensajeAlHistorial(telefono, tenantID, "user", textoLimpio)
		s.agregarMensajeAlHistorial(telefono, tenantID, "assistant", respuesta)
		return respuesta
	}

	// ── Caso IA: lenguaje natural con memoria ──
	if s.iaProvider == nil {
		return s.respuestaFallbackSinIA(textoLimpio)
	}

	// Agregar mensaje del usuario al historial
	s.agregarMensajeAlHistorial(telefono, tenantID, "user", textoLimpio)

	// Obtener historial completo para enviar a la IA
	historial := s.obtenerHistorial(telefono)

	// Obtener contexto del tenant
	contextoTenant := s.construirContextoTenant(ctx, tenantID)

	respuestaIA, err := s.iaProvider.Chat(ctx, ai.ChatRequest{
		SystemPrompt: s.construirPromptSistemaWhatsApp(contextoTenant),
		Messages:     historial,
		MaxTokens:    600,
	})

	if err != nil {
		fmt.Printf("[WhatsApp] Error IA: %v\n", err)
		return s.respuestaFallbackSinIA(textoLimpio)
	}

	contenidoIA := respuestaIA.Content
	fmt.Printf("[WhatsApp] IA respondió (%s, %d tokens) a %s\n", respuestaIA.Provider, respuestaIA.OutputTokens, telefono)

	// ── Detectar si la IA quiere registrar el reclamo ──
	if strings.Contains(contenidoIA, marcadorRegistro) {
		return s.procesarRegistroDesdeIA(ctx, tenantID, telefono, contenidoIA)
	}

	// Respuesta normal conversacional
	respuesta := limpiarMarkdownParaWhatsApp(contenidoIA)
	s.agregarMensajeAlHistorial(telefono, tenantID, "assistant", respuesta)
	return respuesta
}

// ── Registro real del reclamo en BD ─────────────────────────────────────────

func (s *WhatsAppService) procesarRegistroDesdeIA(ctx context.Context, tenantID uuid.UUID, telefono, contenidoIA string) string {
	// Extraer el JSON entre los marcadores
	inicio := strings.Index(contenidoIA, marcadorRegistro)
	fin := strings.Index(contenidoIA, marcadorFin)

	if inicio == -1 || fin == -1 || fin <= inicio {
		fmt.Printf("[WhatsApp] Marcador de registro malformado: %s\n", contenidoIA)
		respuesta := "Tus datos fueron recibidos pero hubo un problema al procesarlos. Por favor, intenta de nuevo o escribe *agente* para hablar con una persona. 🙏"
		s.agregarMensajeAlHistorial(telefono, tenantID, "assistant", respuesta)
		return respuesta
	}

	jsonStr := contenidoIA[inicio+len(marcadorRegistro) : fin]
	jsonStr = strings.TrimSpace(jsonStr)

	var datos datosReclamoWhatsApp
	if err := json.Unmarshal([]byte(jsonStr), &datos); err != nil {
		fmt.Printf("[WhatsApp] Error parseando JSON de reclamo: %v — JSON: %s\n", err, jsonStr)
		respuesta := "Hubo un error al procesar tus datos. ¿Podrías confirmarlos de nuevo? 🙏"
		s.agregarMensajeAlHistorial(telefono, tenantID, "assistant", respuesta)
		return respuesta
	}

	// Validar datos mínimos
	if datos.NombreCompleto == "" || datos.NumeroDocumento == "" || datos.Email == "" || datos.Descripcion == "" {
		fmt.Printf("[WhatsApp] Datos incompletos: %+v\n", datos)
		respuesta := "Algunos datos están incompletos. ¿Podrías revisar y confirmar tu nombre, DNI, email y descripción del problema?"
		s.agregarMensajeAlHistorial(telefono, tenantID, "assistant", respuesta)
		return respuesta
	}

	// Obtener el slug del tenant para CrearPublico
	tenant, err := s.tenantRepo.GetByTenantID(ctx, tenantID)
	if err != nil || tenant == nil {
		fmt.Printf("[WhatsApp] Error obteniendo tenant: %v\n", err)
		respuesta := "Hubo un error interno. Por favor, escribe *agente* para que te atienda una persona. 🙏"
		s.agregarMensajeAlHistorial(telefono, tenantID, "assistant", respuesta)
		return respuesta
	}

	// Normalizar tipo de documento
	tipoDoc := strings.ToUpper(strings.TrimSpace(datos.TipoDocumento))
	if tipoDoc == "" {
		tipoDoc = "DNI"
	}
	// Mapear variaciones comunes
	switch tipoDoc {
	case "DNI", "CE", "RUC", "PASAPORTE":
		// OK
	case "CARNET DE EXTRANJERIA", "CARNÉ DE EXTRANJERÍA":
		tipoDoc = "CE"
	default:
		tipoDoc = "DNI"
	}

	// Si el teléfono viene vacío, usar el del WhatsApp
	telefonoReclamo := strings.TrimSpace(datos.Telefono)
	if telefonoReclamo == "" {
		telefonoReclamo = telefono
	}

	// Construir el DTO
	req := dto.CreateReclamoRequest{
		TipoSolicitud:   "RECLAMO",
		NombreCompleto:   strings.TrimSpace(datos.NombreCompleto),
		TipoDocumento:    tipoDoc,
		NumeroDocumento:  strings.TrimSpace(datos.NumeroDocumento),
		Telefono:         telefonoReclamo,
		Email:            strings.TrimSpace(datos.Email),
		DescripcionBien:  strings.TrimSpace(datos.Descripcion),
		FechaIncidente:   time.Now().Format("2006-01-02"),
		DetalleReclamo:   strings.TrimSpace(datos.Descripcion),
		PedidoConsumidor: "Solución al problema reportado",
	}

	// ¡REGISTRAR EN BD! — esto genera código, calcula fecha límite, envía correos
	reclamo, err := s.reclamoService.CrearPublico(ctx, tenant.Slug, req, "whatsapp", "WhatsApp Bot")
	if err != nil {
		fmt.Printf("[WhatsApp] Error creando reclamo: %v\n", err)

		// Verificar si es error de límite del plan
		errMsg := err.Error()
		if strings.Contains(errMsg, "limite") || strings.Contains(errMsg, "plan") {
			respuesta := "Lo sentimos, el negocio ha alcanzado el límite de reclamos de su plan actual. Por favor, comunícate directamente con la empresa. 📞"
			s.agregarMensajeAlHistorial(telefono, tenantID, "assistant", respuesta)
			return respuesta
		}

		respuesta := "Hubo un error al registrar tu reclamo. Por favor, intenta de nuevo o escribe *agente* para hablar con una persona. 🙏"
		s.agregarMensajeAlHistorial(telefono, tenantID, "assistant", respuesta)
		return respuesta
	}

	// ¡ÉXITO! Construir respuesta con el código real
	respuesta := fmt.Sprintf(
		"✅ *¡Reclamo registrado exitosamente!*\n\n"+
			"📋 *Código:* %s\n"+
			"📅 *Registrado:* %s\n"+
			"⏰ *Fecha límite de respuesta:* %s\n\n"+
			"📧 Recibirás un correo de confirmación en *%s* con todos los detalles.\n\n"+
			"Para consultar el estado de tu reclamo en cualquier momento, envíame tu código: *%s*\n\n"+
			"¿Necesitas algo más? 😊",
		reclamo.CodigoReclamo,
		reclamo.FechaRegistro.Format("02/01/2006"),
		reclamo.FechaLimiteRespuesta.Time.Format("02/01/2006"),
		datos.Email,
		reclamo.CodigoReclamo,
	)

	fmt.Printf("[WhatsApp] ✅ Reclamo %s registrado por %s (tenant: %s)\n",
		reclamo.CodigoReclamo, telefono, tenant.Slug)

	// Guardar en historial y limpiar conversación (flujo completado)
	s.agregarMensajeAlHistorial(telefono, tenantID, "assistant", respuesta)

	return respuesta
}

// ── Gestión de memoria de conversación ──────────────────────────────────────

func (s *WhatsAppService) agregarMensajeAlHistorial(telefono string, tenantID uuid.UUID, rol, contenido string) {
	s.muConversaciones.Lock()
	defer s.muConversaciones.Unlock()

	convo, existe := s.conversaciones[telefono]
	if !existe {
		convo = &conversacionWA{
			mensajes: make([]ai.Message, 0),
			tenantID: tenantID,
		}
		s.conversaciones[telefono] = convo
	}

	convo.mensajes = append(convo.mensajes, ai.Message{
		Role:    rol,
		Content: contenido,
	})
	convo.ultimaActividad = time.Now()

	if len(convo.mensajes) > maxMensajesPorConvo {
		convo.mensajes = convo.mensajes[len(convo.mensajes)-maxMensajesPorConvo:]
	}
}

func (s *WhatsAppService) obtenerHistorial(telefono string) []ai.Message {
	s.muConversaciones.RLock()
	defer s.muConversaciones.RUnlock()

	convo, existe := s.conversaciones[telefono]
	if !existe {
		return nil
	}

	copia := make([]ai.Message, len(convo.mensajes))
	copy(copia, convo.mensajes)
	return copia
}

func (s *WhatsAppService) limpiarConversacionesExpiradas() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		s.muConversaciones.Lock()
		ahora := time.Now()
		eliminadas := 0
		for telefono, convo := range s.conversaciones {
			if ahora.Sub(convo.ultimaActividad) > ttlConversacion {
				delete(s.conversaciones, telefono)
				eliminadas++
			}
		}
		s.muConversaciones.Unlock()

		if eliminadas > 0 {
			fmt.Printf("[WhatsApp] Limpieza: %d conversaciones expiradas eliminadas\n", eliminadas)
		}
	}
}

// ── Prompt del sistema — CON INSTRUCCIÓN DE REGISTRO REAL ───────────────────

func (s *WhatsAppService) construirPromptSistemaWhatsApp(contextoTenant string) string {
	return fmt.Sprintf(`Eres el asistente de atención al cliente por WhatsApp de un Libro de Reclamaciones digital.
Respondes SOLO en español. Tus respuestas son para WhatsApp: CORTAS (máximo 300 palabras).

REGLAS ESTRICTAS:
1. SOLO ayudas con temas de RECLAMOS Y QUEJAS del negocio.
2. Temas fuera de alcance (clima, deportes, chistes, etc.) → responde amablemente que solo ayudas con reclamos.
3. NUNCA inventes datos, códigos ni estados.
4. Formato WhatsApp: *negritas* con asteriscos, NO uses ## ni markdown.
5. Emojis con moderación (3-4 máximo).
6. TIENES MEMORIA: usa los mensajes anteriores para dar continuidad.
7. NO repitas el menú si el usuario ya eligió una opción.
8. Sé conversacional, natural y amable.

MENÚ PRINCIPAL (solo al inicio o si el usuario pide volver):
1️⃣ Registrar un reclamo
2️⃣ Consultar estado de mi reclamo
3️⃣ Hablar con un agente

FLUJO PARA REGISTRAR RECLAMO — PIDE DATOS UNO POR UNO:
1. *Nombre completo*
2. *DNI* (8 dígitos) — si da otro tipo de documento, acéptalo (CE, Pasaporte, RUC)
3. *Email*
4. *Teléfono* (puede ser el mismo de WhatsApp)
5. *Descripción del problema* (qué pasó, qué producto/servicio, cuándo)

Espera la respuesta de cada dato antes de pedir el siguiente.
Cuando tengas TODOS los datos, muestra un resumen y pregunta "¿Es correcto?"

ACCIÓN CRÍTICA — CUANDO EL USUARIO CONFIRMA QUE LOS DATOS SON CORRECTOS:
Cuando el usuario diga "sí", "correcto", "confirmo", "dale", "ok" (después de ver el resumen), 
tu respuesta DEBE contener EXACTAMENTE este bloque al final (el sistema lo detecta para registrar el reclamo en la base de datos):

>>>REGISTRAR_RECLAMO:{"nombre_completo":"Jose Roberto La Rosa Ledezma","tipo_documento":"DNI","numero_documento":"07115385","email":"jose@gmail.com","telefono":"938192665","descripcion":"Me mandaron mi gato sin baterias y no conecta al wifi"}<<<

REGLAS DEL BLOQUE DE REGISTRO:
- El JSON debe ser válido, en UNA sola línea, sin saltos de línea dentro.
- tipo_documento debe ser: DNI, CE, Pasaporte, o RUC.
- Usa los datos EXACTOS que el usuario proporcionó.
- ANTES del bloque, escribe un mensaje amable como "Perfecto, registrando tu reclamo... ⏳"
- El bloque >>>REGISTRAR_RECLAMO:...<<< NO será visible para el usuario, el sistema lo intercepta.

FLUJO PARA CONSULTAR ESTADO:
- Pide el código de reclamo
- Dile que lo encuentra en el correo de confirmación

FLUJO PARA AGENTE HUMANO:
- Confirma que un agente se comunicará pronto
- Pide nombre y descripción breve

%s`, contextoTenant)
}

// construirContextoTenant agrega info del negocio al prompt.
func (s *WhatsAppService) construirContextoTenant(ctx context.Context, tenantID uuid.UUID) string {
	tenant, err := s.tenantRepo.GetByTenantID(ctx, tenantID)
	if err != nil || tenant == nil {
		return "DATOS DEL NEGOCIO: No disponibles."
	}

	partes := []string{
		fmt.Sprintf("DATOS DEL NEGOCIO:\n- Empresa: %s", tenant.RazonSocial),
		fmt.Sprintf("- RUC: %s", tenant.RUC),
	}

	if tenant.SitioWeb.Valid && tenant.SitioWeb.String != "" {
		partes = append(partes, fmt.Sprintf("- Portal web: %s", tenant.SitioWeb.String))
	}
	if tenant.EmailContacto.Valid && tenant.EmailContacto.String != "" {
		partes = append(partes, fmt.Sprintf("- Email contacto: %s", tenant.EmailContacto.String))
	}
	if tenant.Telefono.Valid && tenant.Telefono.String != "" {
		partes = append(partes, fmt.Sprintf("- Teléfono: %s", tenant.Telefono.String))
	}

	partes = append(partes, fmt.Sprintf("- Plazo de respuesta: %d días calendario", tenant.PlazoRespuestaDias))

	return strings.Join(partes, "\n")
}

// ── Respuestas fallback cuando la IA no está disponible ─────────────────────

func (s *WhatsAppService) respuestaFallbackSinIA(texto string) string {
	textoNormalizado := strings.ToLower(strings.TrimSpace(texto))

	switch {
	case textoContieneAlgunaPalabra(textoNormalizado, "hola", "buenos dias", "buenas tardes", "buenas noches", "hi", "hello", "hey"):
		return "¡Hola! 👋 Soy el asistente de Libro de Reclamaciones.\n\n" +
			"¿En qué puedo ayudarte?\n\n" +
			"1️⃣ *Registrar un reclamo*\n" +
			"2️⃣ *Consultar estado de mi reclamo*\n" +
			"3️⃣ *Hablar con un agente*\n\n" +
			"Escribe el número o cuéntame qué necesitas."

	case textoContieneAlgunaPalabra(textoNormalizado, "estado", "consultar", "seguimiento", "codigo", "código") || textoNormalizado == "2":
		return "Para consultar el estado de tu reclamo, envíame tu *código de reclamo*.\n\n" +
			"El código tiene un formato como: *2026-DEMO-XXXX-XXXXX*\n" +
			"Lo encuentras en el correo de confirmación."

	case textoContieneAlgunaPalabra(textoNormalizado, "reclamo", "queja", "problema", "reclamar") || textoNormalizado == "1":
		return "Puedes registrar tu reclamo en nuestro portal web para que quede formalizado. 📝\n\n" +
			"Si prefieres hacerlo por aquí, cuéntame:\n" +
			"¿Cuál es tu *nombre completo*?"

	case textoContieneAlgunaPalabra(textoNormalizado, "agente", "humano", "persona", "operador") || textoNormalizado == "3":
		return "Un agente se pondrá en contacto contigo pronto. ⏳\n\n" +
			"Mientras tanto, ¿podrías dejarme tu nombre y describir brevemente tu caso?"

	case textoContieneAlgunaPalabra(textoNormalizado, "gracias", "thanks", "ok", "perfecto", "listo"):
		return "¡Con gusto! 😊 Si necesitas algo más, escríbeme."

	default:
		return "Puedo ayudarte con temas de reclamos y quejas. 📋\n\n" +
			"1️⃣ *Registrar un reclamo*\n" +
			"2️⃣ *Consultar estado de mi reclamo*\n" +
			"3️⃣ *Hablar con un agente*\n\n" +
			"¿En qué te puedo ayudar?"
	}
}

// ── Consulta de reclamo en base de datos ────────────────────────────────────

func (s *WhatsAppService) buscarReclamoEnBaseDeDatosYFormatear(ctx context.Context, tenantID uuid.UUID, texto string) string {
	codigo := strings.ToUpper(strings.TrimSpace(texto))

	reclamo, err := s.reclamoService.GetByCodigoPublico(ctx, tenantID, codigo)
	if err != nil || reclamo == nil {
		return fmt.Sprintf("🔍 No encontré ningún reclamo con el código *%s*.\n\n"+
			"Verifica que sea correcto. Lo encuentras en el correo de confirmación.\n\n"+
			"Si necesitas ayuda, escribe *agente*.", codigo)
	}

	estadoFormateado := formatearEstadoConEmoji(reclamo.Estado)

	fechaLimiteFormateada := "No definida"
	if reclamo.FechaLimiteRespuesta.Valid {
		fechaLimiteFormateada = reclamo.FechaLimiteRespuesta.Time.Format("02/01/2006")
	}

	lineaFechaRespuesta := ""
	if reclamo.FechaRespuesta.Valid {
		lineaFechaRespuesta = fmt.Sprintf("\n📩 *Fecha respuesta:* %s", reclamo.FechaRespuesta.Time.Format("02/01/2006"))
	}

	descripcionRecortada := recortarTexto(reclamo.DescripcionBien, 200)

	return fmt.Sprintf(
		"✅ *Reclamo encontrado*\n\n"+
			"📋 *Código:* %s\n"+
			"📌 *Estado:* %s\n"+
			"📅 *Registrado:* %s\n"+
			"⏰ *Fecha límite:* %s%s\n\n"+
			"📝 *Descripción:* %s\n\n"+
			"Si necesitas más detalles, escribe *agente*.",
		reclamo.CodigoReclamo,
		estadoFormateado,
		reclamo.FechaRegistro.Format("02/01/2006"),
		fechaLimiteFormateada,
		lineaFechaRespuesta,
		descripcionRecortada,
	)
}

// ── Funciones auxiliares ────────────────────────────────────────────────────

func formatearEstadoConEmoji(estado string) string {
	m := map[string]string{
		"PENDIENTE":  "🟡 Pendiente",
		"EN_PROCESO": "🔵 En Proceso",
		"RESUELTO":   "🟢 Resuelto",
		"CERRADO":    "⚫ Cerrado",
		"RECHAZADO":  "🔴 Rechazado",
	}
	if f, ok := m[estado]; ok {
		return f
	}
	return estado
}

func recortarTexto(texto string, max int) string {
	runas := []rune(texto)
	if len(runas) <= max {
		return texto
	}
	return string(runas[:max]) + "..."
}

func textoContieneAlgunaPalabra(texto string, palabras ...string) bool {
	for _, p := range palabras {
		if strings.Contains(texto, p) {
			return true
		}
	}
	return false
}

func textoPareceCodigo(texto string) bool {
	t := strings.ToUpper(strings.TrimSpace(texto))
	if strings.HasPrefix(t, "REC-") {
		return true
	}
	for _, anio := range []string{"2024-", "2025-", "2026-", "2027-", "2028-"} {
		if strings.Contains(t, anio) {
			return true
		}
	}
	return false
}

func limpiarMarkdownParaWhatsApp(texto string) string {
	resultado := strings.ReplaceAll(texto, "**", "*")
	lineas := strings.Split(resultado, "\n")
	var limpias []string
	for _, linea := range lineas {
		l := strings.TrimSpace(linea)
		for _, prefix := range []string{"### ", "## ", "# "} {
			if strings.HasPrefix(l, prefix) {
				l = "*" + strings.TrimPrefix(l, prefix) + "*"
				break
			}
		}
		limpias = append(limpias, l)
	}
	return strings.Join(limpias, "\n")
}
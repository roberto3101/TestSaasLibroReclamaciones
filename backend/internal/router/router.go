package router

import (
	"database/sql"
	"fmt"

	"libro-reclamaciones/internal/ai"
	"libro-reclamaciones/internal/config"
	"libro-reclamaciones/internal/controller"
	"libro-reclamaciones/internal/middleware"
	"libro-reclamaciones/internal/repo"
	"libro-reclamaciones/internal/service"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, cfg *config.Config, db *sql.DB) {
	// --- Repos ---
	planRepo := repo.NewPlanRepo(db)
	suscripcionRepo := repo.NewSuscripcionRepo(db)
	tenantRepo := repo.NewTenantRepo(db)
	sedeRepo := repo.NewSedeRepo(db)
	usuarioRepo := repo.NewUsuarioRepo(db)
	reclamoRepo := repo.NewReclamoRepo(db)
	respuestaRepo := repo.NewRespuestaRepo(db)
	historialRepo := repo.NewHistorialRepo(db)
	mensajeRepo := repo.NewMensajeRepo(db)
	sesionRepo := repo.NewSesionRepo(db)
	dashboardRepo := repo.NewDashboardRepo(db)
	chatbotRepo := repo.NewChatbotRepo(db)
	apiKeyRepo := repo.NewChatbotAPIKeyRepo(db)
	logRepo := repo.NewChatbotLogRepo(db)
	canalWARepo := repo.NewCanalWhatsAppRepo(db)
	solicitudAsesorRepo := repo.NewSolicitudAsesorRepo(db)
	mensajeAtencionRepo := repo.NewMensajeAtencionRepo(db)

	// --- Services ---
	notifService := service.NewNotificacionService(cfg.SMTP)

	planService := service.NewPlanService(planRepo)
	suscripcionService := service.NewSuscripcionService(suscripcionRepo, planRepo)
	tenantService := service.NewTenantService(tenantRepo)
	sedeService := service.NewSedeService(sedeRepo, dashboardRepo)
	usuarioService := service.NewUsuarioService(usuarioRepo, dashboardRepo)
	authService := service.NewAuthService(usuarioRepo, sesionRepo, tenantRepo, cfg.JWT)
	reclamoService := service.NewReclamoService(reclamoRepo, historialRepo, tenantRepo, sedeRepo, dashboardRepo, notifService)
	respuestaService := service.NewRespuestaService(respuestaRepo, reclamoRepo, historialRepo, notifService, tenantRepo)
	mensajeService := service.NewMensajeService(mensajeRepo, reclamoRepo, tenantRepo, notifService)
	chatbotService := service.NewChatbotService(chatbotRepo, apiKeyRepo, dashboardRepo, cfg.APIKey.Prefix)
	mensajeAtencionService := service.NewMensajeAtencionService(mensajeAtencionRepo, solicitudAsesorRepo, canalWARepo)
	solicitudAsesorService := service.NewSolicitudAsesorService(solicitudAsesorRepo, mensajeAtencionService, canalWARepo, usuarioRepo)

	// --- Controllers ---
	planCtrl := controller.NewPlanController(planService)
	limitesRepo := repo.NewLimitesRepo(db)
	limitesService := service.NewLimitesService(limitesRepo, cfg.Server.Env)
	suscripcionCtrl := controller.NewSuscripcionController(suscripcionService, limitesService)
	tenantCtrl := controller.NewTenantController(tenantService)
	sedeCtrl := controller.NewSedeController(sedeService)
	usuarioCtrl := controller.NewUsuarioController(usuarioService)
	authCtrl := controller.NewAuthController(authService)
	reclamoCtrl := controller.NewReclamoController(reclamoService)
	exportarPDFServicio := service.NuevoExportarPDFServicio()
	exportarExcelServicio := service.NuevoExportarExcelServicio()
	exportarCtrl := controller.NuevoExportarControlador(reclamoService, tenantService, exportarPDFServicio, exportarExcelServicio)

	respuestaCtrl := controller.NewRespuestaController(respuestaService)
	mensajeCtrl := controller.NewMensajeController(mensajeService)
	publicCtrl := controller.NewPublicController(reclamoService, tenantService, sedeService, mensajeService, respuestaService)
	dashboardCtrl := controller.NewDashboardController(dashboardRepo)
	chatbotCtrl := controller.NewChatbotController(chatbotService)
	botAPICtrl := controller.NewBotAPIController(reclamoService, respuestaService, mensajeService, logRepo)
	solicitudAsesorCtrl := controller.NewSolicitudAsesorController(solicitudAsesorService)
	mensajeAtencionCtrl := controller.NewMensajeAtencionController(mensajeAtencionService)

	onboardingService := service.NewOnboardingService(db, planRepo, tenantRepo, sedeRepo, usuarioRepo, suscripcionRepo)
	onboardingCtrl := controller.NewOnboardingController(onboardingService)

	// --- Middlewares ---
	authMw := middleware.AuthMiddleware(cfg.JWT)
	tenantMw := middleware.TenantMiddleware(db)

	// --- Rutas públicas ---
	RegisterPublicRoutes(r, publicCtrl)
	RegisterOnboardingRoutes(r, onboardingCtrl)

	// --- Rutas admin (JWT) ---
	RegisterAuthRoutes(r, authCtrl, authMw, tenantMw)
	RegisterPlanRoutes(r, planCtrl, authMw, tenantMw)
	RegisterSuscripcionRoutes(r, suscripcionCtrl, authMw, tenantMw)
	RegisterTenantRoutes(r, tenantCtrl, authMw, tenantMw)
	RegisterSedeRoutes(r, sedeCtrl, authMw, tenantMw)
	RegisterUsuarioRoutes(r, usuarioCtrl, authMw, tenantMw)
	RegistrarRutasExportacion(r, exportarCtrl, authMw, tenantMw)
	RegisterReclamoRoutes(r, reclamoCtrl, authMw, tenantMw)
	RegisterRespuestaRoutes(r, respuestaCtrl, authMw, tenantMw)
	RegisterMensajeRoutes(r, mensajeCtrl, authMw, tenantMw)
	RegisterDashboardRoutes(r, dashboardCtrl, authMw, tenantMw)
	RegisterChatbotRoutes(r, chatbotCtrl, authMw, tenantMw)
	adminMw := middleware.RoleMiddleware("ADMIN")
	RegisterPlanAdminRoutes(r, planCtrl, authMw, tenantMw, adminMw)
	RegisterSolicitudAsesorRoutes(r, solicitudAsesorCtrl, mensajeAtencionCtrl, authMw, tenantMw)

	// --- API externa para chatbots (API Key) ---
	RegisterBotAPIRoutes(r, botAPICtrl, apiKeyRepo, chatbotRepo, logRepo, cfg.RateLimit)

	// --- Proveedor de IA (compartido entre asistente interno y WhatsApp) ---
	var aiProvider ai.Provider
	if cfg.AI.Provider != "" {
		primaryCfg := ai.GatewayConfig{
			Provider: cfg.AI.Provider,
			APIKey:   cfg.AI.APIKey,
			Model:    cfg.AI.Model,
			BaseURL:  cfg.AI.BaseURL,
		}

		var fallbackCfg *ai.GatewayConfig
		if cfg.AI.FallbackProvider != "" {
			fallbackCfg = &ai.GatewayConfig{
				Provider: cfg.AI.FallbackProvider,
				APIKey:   cfg.AI.FallbackAPIKey,
				Model:    cfg.AI.FallbackModel,
				BaseURL:  cfg.AI.FallbackBaseURL,
			}
		}

		var err error
		aiProvider, err = ai.NewProviderWithFallback(primaryCfg, fallbackCfg)
		if err != nil {
			fmt.Printf("[WARN] Proveedor IA no disponible: %v\n", err)
		}
	}

	// --- WhatsApp: Webhook + Config Admin ---
	if cfg.WhatsApp.Enabled {
		whatsappService := service.NewWhatsAppService(
			reclamoService,
			solicitudAsesorService,
			mensajeAtencionService,
			tenantRepo,
			canalWARepo,
			chatbotRepo,
			aiProvider,
		)

		whatsappCtrl := controller.NewWhatsAppController(cfg.WhatsApp, whatsappService)
		RegistrarRutasWebhookWhatsApp(r, whatsappCtrl)

		// ← CAMBIO: ahora recibe limitesService para validar límite de canales
		whatsappConfigCtrl := controller.NewWhatsAppConfigController(canalWARepo, chatbotRepo, limitesService)
		RegisterWhatsAppConfigRoutes(r, whatsappConfigCtrl, authMw, tenantMw)

		iaStatus := "sin IA (respuestas fijas)"
		if aiProvider != nil {
			iaStatus = aiProvider.Name()
		}
		fmt.Printf("[INFO] WhatsApp webhook activo en /webhook/whatsapp (multi-tenant + IA: %s)\n", iaStatus)
		fmt.Println("[INFO] WhatsApp config admin en /api/v1/canales/whatsapp")
	}

	// --- Asistente IA interno (panel admin) ---
	if aiProvider != nil {
		assistantRepo := repo.NewAssistantRepo(db)
		historialAsistenteRepo := repo.NewAsistenteHistorialRepo(db)
		assistantService := service.NewAssistantService(aiProvider, assistantRepo, historialAsistenteRepo, tenantRepo)
		assistantCtrl := controller.NewAssistantController(assistantService)
		RegisterAssistantRoutes(r, assistantCtrl, authMw, tenantMw)
		fmt.Printf("[INFO] Asistente IA activo (proveedor: %s)\n", aiProvider.Name())
	} else {
		fmt.Println("[INFO] Asistente IA desactivado (AI_PROVIDER no configurado)")
	}
}
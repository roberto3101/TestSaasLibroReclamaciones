package router

import (
	"libro-reclamaciones/internal/config"
	"libro-reclamaciones/internal/controller"
	"libro-reclamaciones/internal/middleware"
	"libro-reclamaciones/internal/repo"

	"github.com/gin-gonic/gin"
)

func RegisterBotAPIRoutes(r *gin.Engine, ctrl *controller.BotAPIController, apiKeyRepo *repo.ChatbotAPIKeyRepo, logRepo *repo.ChatbotLogRepo, rateCfg config.RateLimitConfig) {
	bot := r.Group("/api/bot/v1")
	bot.Use(
		middleware.APIKeyMiddleware(apiKeyRepo),
		middleware.RateLimitMiddleware(logRepo, rateCfg),
	)
	{
		// Lectura
		bot.GET("/reclamos", ctrl.GetReclamos)
		bot.GET("/reclamos/:id", ctrl.GetReclamo)

		// Escritura
		bot.POST("/reclamos/:id/mensajes", ctrl.CreateMensaje)
		bot.PATCH("/reclamos/:id/estado", ctrl.CambiarEstado)
	}
}
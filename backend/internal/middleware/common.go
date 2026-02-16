package middleware

import (
	"log"
	"net/http"
	"time"

	"libro-reclamaciones/internal/config"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware configura headers CORS desde config.
func CORSMiddleware(cfg config.CORSConfig) gin.HandlerFunc {
	allowedMap := make(map[string]bool, len(cfg.AllowedOrigins))
	for _, o := range cfg.AllowedOrigins {
		allowedMap[o] = true
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if allowedMap[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// LoggerMiddleware loguea cada request con duración.
func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		duration := time.Since(start)
		status := c.Writer.Status()

		log.Printf("[%s] %d %s %s %v",
			c.Request.Method, status, path, c.ClientIP(), duration)
	}
}

// RecoveryMiddleware atrapa panics y devuelve 500.
func RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("[PANIC] %v", err)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error": gin.H{
						"code":    "INTERNAL_ERROR",
						"message": "Error interno del servidor",
					},
				})
			}
		}()
		c.Next()
	}
}

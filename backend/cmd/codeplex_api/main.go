package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"libro-reclamaciones/internal/config"
	"libro-reclamaciones/internal/db"
	"libro-reclamaciones/internal/middleware"
	"libro-reclamaciones/internal/router"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Cargar configuración
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Error cargando configuración: %v", err)
	}

	// 2. Conectar a CockroachDB
	cockroach, err := db.NewCockroachDB(cfg.Cockroach)
	if err != nil {
		log.Fatalf("Error conectando a CockroachDB: %v", err)
	}
	defer cockroach.Close()
	log.Printf("✓ CockroachDB conectado: %s:%s/%s",
		cfg.Cockroach.Host, cfg.Cockroach.Port, cfg.Cockroach.DBName)

	// 3. Configurar Gin
	if !cfg.Server.IsDevelopment() {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// 4. Middlewares globales
	r.Use(middleware.RecoveryMiddleware())
	r.Use(middleware.LoggerMiddleware())
	r.Use(middleware.CORSMiddleware(cfg.CORS))

	// 5. Health check
	r.GET("/health", func(c *gin.Context) {
		if err := cockroach.Health(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "unhealthy",
				"db":     err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "db": "connected"})
	})

	// 6. Registrar rutas
	router.RegisterRoutes(r, cfg, cockroach.DB())

	// 7. Iniciar servidor con graceful shutdown
	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("✓ Servidor iniciado en :%s [%s]", cfg.Server.Port, cfg.Server.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Error iniciando servidor: %v", err)
		}
	}()

	<-quit
	log.Println("Apagando servidor...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Error apagando servidor: %v", err)
	}
	log.Println("✓ Servidor apagado correctamente")
}
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config raíz — agrupa todas las configuraciones del sistema.
type Config struct {
	Server    ServerConfig
	Cockroach CockroachConfig
	JWT       JWTConfig
	APIKey    APIKeyConfig
	RateLimit RateLimitConfig
	CORS      CORSConfig
	SMTP      SMTPConfig
	AI        AIConfig
	WhatsApp  WhatsAppConfig
}

type ServerConfig struct {
	Port string
	Env  string // development | production
}

type CockroachConfig struct {
	Host            string
	Port            string
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

type JWTConfig struct {
	Secret          string
	ExpirationHours int
}

type APIKeyConfig struct {
	Prefix string // "crb"
}

type RateLimitConfig struct {
	RequestsPerMin int
	RequestsPerDay int
}

type CORSConfig struct {
	AllowedOrigins []string
}

type SMTPConfig struct {
	Host string
	Port int
	User string
	Pass string
	From string
}

// AIConfig configuración del asistente IA multi-proveedor con fallback.
type AIConfig struct {
	Provider string // "ollama" | "anthropic" | "openai" | "google"
	APIKey   string
	Model    string
	BaseURL  string // Para Ollama o APIs OpenAI-compatible (Groq, Together, etc.)

	// Fallback: si el provider principal falla, intenta con este
	FallbackProvider string
	FallbackAPIKey   string
	FallbackModel    string
	FallbackBaseURL  string
}

// WhatsAppConfig configuración global de WhatsApp Business Cloud API.
// Los tokens y phone_id por tenant ahora viven en la tabla canales_whatsapp.
// Solo se conserva VerifyToken como token global para la verificación inicial del webhook por Meta.
type WhatsAppConfig struct {
	VerifyToken string // Token global para verificación del webhook con Meta
	Enabled     bool   // Si el módulo WhatsApp está habilitado
}

// DSN retorna el connection string para CockroachDB.
func (c CockroachConfig) DSN() string {
	if c.Password != "" {
		return fmt.Sprintf(
			"postgresql://%s:%s@%s:%s/%s?sslmode=%s",
			c.User, c.Password, c.Host, c.Port, c.DBName, c.SSLMode,
		)
	}
	return fmt.Sprintf(
		"postgresql://%s@%s:%s/%s?sslmode=%s",
		c.User, c.Host, c.Port, c.DBName, c.SSLMode,
	)
}

// IsDevelopment retorna true si estamos en modo desarrollo.
func (c ServerConfig) IsDevelopment() bool {
	return c.Env == "development"
}

// Load carga la configuración desde variables de entorno.
func Load() (*Config, error) {
	_ = godotenv.Load()

	verifyToken := env("WHATSAPP_VERIFY_TOKEN", "")

	cfg := &Config{
		Server: ServerConfig{
			Port: env("SERVER_PORT", "8080"),
			Env:  env("SERVER_ENV", "development"),
		},
		Cockroach: CockroachConfig{
			Host:            env("CRDB_HOST", "localhost"),
			Port:            env("CRDB_PORT", "26257"),
			User:            env("CRDB_USER", "root"),
			Password:        env("CRDB_PASSWORD", ""),
			DBName:          env("CRDB_DATABASE", "saaslibroreclamacionesv1"),
			SSLMode:         env("CRDB_SSLMODE", "disable"),
			MaxOpenConns:    envInt("CRDB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    envInt("CRDB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: time.Duration(envInt("CRDB_CONN_MAX_LIFETIME_MIN", 30)) * time.Minute,
		},
		JWT: JWTConfig{
			Secret:          env("JWT_SECRET", ""),
			ExpirationHours: envInt("JWT_EXPIRATION_HOURS", 24),
		},
		APIKey: APIKeyConfig{
			Prefix: env("API_KEY_PREFIX", "crb"),
		},
		RateLimit: RateLimitConfig{
			RequestsPerMin: envInt("RATE_LIMIT_REQUESTS_PER_MIN", 60),
			RequestsPerDay: envInt("RATE_LIMIT_REQUESTS_PER_DAY", 5000),
		},
		CORS: CORSConfig{
			AllowedOrigins: envSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
		},
		SMTP: SMTPConfig{
			Host: env("SMTP_HOST", "smtp.gmail.com"),
			Port: envInt("SMTP_PORT", 587),
			User: env("SMTP_USER", ""),
			Pass: env("SMTP_PASS", ""),
			From: env("SMTP_FROM", "no-reply@saaslibro.com"),
		},
		AI: AIConfig{
			Provider: env("AI_PROVIDER", ""),
			APIKey:   env("AI_API_KEY", ""),
			Model:    env("AI_MODEL", ""),
			BaseURL:  env("AI_BASE_URL", ""),

			FallbackProvider: env("AI_FALLBACK_PROVIDER", ""),
			FallbackAPIKey:   env("AI_FALLBACK_API_KEY", ""),
			FallbackModel:    env("AI_FALLBACK_MODEL", ""),
			FallbackBaseURL:  env("AI_FALLBACK_BASE_URL", ""),
		},
		WhatsApp: WhatsAppConfig{
			VerifyToken: verifyToken,
			Enabled:     verifyToken != "",
		},
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// validate verifica que las variables críticas estén presentes.
func (c *Config) validate() error {
	if c.JWT.Secret == "" {
		return fmt.Errorf("JWT_SECRET es obligatorio")
	}
	if len(c.JWT.Secret) < 32 {
		return fmt.Errorf("JWT_SECRET debe tener al menos 32 caracteres")
	}
	if c.Cockroach.DBName == "" {
		return fmt.Errorf("CRDB_DATABASE es obligatorio")
	}
	return nil
}

// --- Helpers DRY para leer env vars ---

func env(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}

func envInt(key string, fallback int) int {
	val := env(key, "")
	if val == "" {
		return fallback
	}
	n, err := strconv.Atoi(val)
	if err != nil {
		return fallback
	}
	return n
}

func envSlice(key string, fallback []string) []string {
	val := env(key, "")
	if val == "" {
		return fallback
	}
	parts := strings.Split(val, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
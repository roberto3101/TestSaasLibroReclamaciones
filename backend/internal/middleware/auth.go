package middleware

import (
	"strings"
	"time"

	"libro-reclamaciones/internal/apperror"
	"libro-reclamaciones/internal/config"
	"libro-reclamaciones/internal/helper"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims estructura del JWT.
type Claims struct {
	TenantID string `json:"tenant_id"`
	UserID   string `json:"user_id"`
	Role     string `json:"role"`
	SedeID   string `json:"sede_id,omitempty"`
	jwt.RegisteredClaims
}

// AuthMiddleware valida el JWT y extrae tenant_id + user_id.
func AuthMiddleware(jwtCfg config.JWTConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractBearerToken(c)
		if token == "" {
			helper.Error(c, apperror.ErrTokenRequerido)
			c.Abort()
			return
		}

		claims, err := parseToken(token, jwtCfg.Secret)
		if err != nil {
			helper.Error(c, apperror.ErrTokenInvalido)
			c.Abort()
			return
		}

		tenantID, err := uuid.Parse(claims.TenantID)
		if err != nil {
			helper.Error(c, apperror.ErrTokenInvalido)
			c.Abort()
			return
		}

		userID, err := uuid.Parse(claims.UserID)
		if err != nil {
			helper.Error(c, apperror.ErrTokenInvalido)
			c.Abort()
			return
		}

		// Inyectar en contexto
		helper.SetContext(c, helper.CtxTenantID, tenantID)
		helper.SetContext(c, helper.CtxUserID, userID)
		helper.SetContext(c, helper.CtxUserRole, claims.Role)
		if claims.SedeID != "" {
			if sedeUUID, err := uuid.Parse(claims.SedeID); err == nil {
				helper.SetContext(c, helper.CtxSedeID, sedeUUID)
			}
		}
		helper.SetContext(c, helper.CtxIPAddress, helper.GetClientIP(c))

		c.Next()
	}
}

// GenerateToken crea un JWT firmado.
func GenerateToken(tenantID, userID uuid.UUID, role string, sedeID *uuid.UUID, jwtCfg config.JWTConfig) (string, error) {
	now := time.Now()
	sedeStr := ""
	if sedeID != nil {
		sedeStr = sedeID.String()
	}
	claims := Claims{
		TenantID: tenantID.String(),
		UserID:   userID.String(),
		Role:     role,
		SedeID:   sedeStr,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(jwtCfg.ExpirationHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtCfg.Secret))
}

func extractBearerToken(c *gin.Context) string {
	header := c.GetHeader("Authorization")
	if header == "" {
		return ""
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

func parseToken(tokenStr, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}

	return claims, nil
}

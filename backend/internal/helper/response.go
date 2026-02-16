package helper

import (
	"net/http"

	"libro-reclamaciones/internal/apperror"
	"libro-reclamaciones/internal/model/dto"

	"github.com/gin-gonic/gin"
	"fmt"
)

// Success respuesta exitosa con datos.
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    data,
	})
}

// Created respuesta de recurso creado.
func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, dto.APIResponse{
		Success: true,
		Data:    data,
	})
}

// NoContent respuesta sin cuerpo (204).
func NoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

// Error respuesta de error. Detecta AppError automáticamente.
func Error(c *gin.Context, err error) {
	if appErr, ok := err.(*apperror.AppError); ok {
		c.JSON(appErr.Status, dto.APIResponse{
			Success: false,
			Error: &dto.APIError{
				Code:    appErr.Code,
				Message: appErr.Message,
			},
		})
		return
	}

	// Error genérico → 500 (log para debugging)
	fmt.Println("[ERROR 500]", err.Error())
	c.JSON(http.StatusInternalServerError, dto.APIResponse{
		Success: false,
		Error: &dto.APIError{
			Code:    "INTERNAL_ERROR",
			Message: "Error interno del servidor",
		},
	})
}

// ValidationError respuesta de error de validación (400).
func ValidationError(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, dto.APIResponse{
		Success: false,
		Error: &dto.APIError{
			Code:    "VALIDATION_ERROR",
			Message: message,
		},
	})
}

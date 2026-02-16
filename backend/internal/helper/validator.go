package helper

import (
	"regexp"
	"strings"
)

var (
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	rucRegex   = regexp.MustCompile(`^(10|15|17|20)\d{9}$`)
	dniRegex   = regexp.MustCompile(`^\d{8}$`)
	ceRegex    = regexp.MustCompile(`^\d{9,12}$`)
	slugRegex  = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
)

// ValidateEmail verifica formato de email.
func ValidateEmail(email string) bool {
	return emailRegex.MatchString(strings.TrimSpace(email))
}

// ValidateRUC verifica formato de RUC peruano (11 dígitos, empieza con 10, 15, 17 o 20).
func ValidateRUC(ruc string) bool {
	return rucRegex.MatchString(strings.TrimSpace(ruc))
}

// ValidateDNI verifica formato de DNI peruano (8 dígitos).
func ValidateDNI(dni string) bool {
	return dniRegex.MatchString(strings.TrimSpace(dni))
}

// ValidateCE verifica formato de Carné de Extranjería (9-12 dígitos).
func ValidateCE(ce string) bool {
	return ceRegex.MatchString(strings.TrimSpace(ce))
}

// ValidateDocumento valida según el tipo de documento.
func ValidateDocumento(tipo, numero string) bool {
	switch strings.ToUpper(tipo) {
	case "DNI":
		return ValidateDNI(numero)
	case "CE":
		return ValidateCE(numero)
	case "RUC":
		return ValidateRUC(numero)
	case "Pasaporte":
		return len(strings.TrimSpace(numero)) >= 5
	default:
		return false
	}
}

// ValidateSlug verifica que un slug sea válido (minúsculas, números, guiones).
func ValidateSlug(slug string) bool {
	return slugRegex.MatchString(slug)
}

// Required verifica que un string no esté vacío.
func Required(value, field string) string {
	if strings.TrimSpace(value) == "" {
		return field + " es obligatorio"
	}
	return ""
}

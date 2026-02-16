package helper

import "time"

// CalcularFechaLimite calcula la fecha límite de respuesta.
// fecha_registro + plazo_respuesta_dias (días calendario).
func CalcularFechaLimite(fechaRegistro time.Time, plazoDias int) time.Time {
	return fechaRegistro.AddDate(0, 0, plazoDias)
}

// DiasRestantes calcula cuántos días quedan para responder.
// Negativo si ya venció.
func DiasRestantes(fechaLimite time.Time) int {
	today := time.Now().Truncate(24 * time.Hour)
	limite := fechaLimite.Truncate(24 * time.Hour)
	diff := limite.Sub(today)
	return int(diff.Hours() / 24)
}

// Prioridad calcula la prioridad de un reclamo basado en días restantes.
func Prioridad(fechaLimite time.Time, estado string) string {
	if estado == "RESUELTO" || estado == "CERRADO" {
		return "COMPLETADO"
	}
	dias := DiasRestantes(fechaLimite)
	switch {
	case dias < 0:
		return "VENCIDO"
	case dias <= 3:
		return "URGENTE"
	default:
		return "EN_TIEMPO"
	}
}

// InicioMesActual retorna el primer día del mes actual a las 00:00.
// Se usa para contar reclamos del mes (límite del plan).
func InicioMesActual() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
}

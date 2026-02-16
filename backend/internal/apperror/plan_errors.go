package apperror

// Errores de límites de plan.
var (
	ErrPlanLimitSedes = New(403, "PLAN_LIMIT_SEDES",
		"Tu plan permite máximo %d sedes. Mejora tu plan.")

	ErrPlanLimitUsuarios = New(403, "PLAN_LIMIT_USUARIOS",
		"Tu plan permite máximo %d usuarios. Mejora tu plan.")

	ErrPlanLimitReclamos = New(403, "PLAN_LIMIT_RECLAMOS",
		"Límite de %d reclamos/mes alcanzado. Mejora tu plan.")

	ErrPlanLimitChatbots = New(403, "PLAN_LIMIT_CHATBOTS",
		"Tu plan permite máximo %d chatbots. Mejora tu plan.")

	ErrPlanSinChatbot = New(403, "PLAN_NO_CHATBOT",
		"Tu plan no incluye chatbots. Mejora a IRON o GOLD.")

	ErrPlanSinWhatsapp = New(403, "PLAN_NO_WHATSAPP",
		"Tu plan no incluye notificaciones WhatsApp.")

	ErrPlanSinReportes = New(403, "PLAN_NO_REPORTES",
		"Tu plan no incluye reportes PDF.")

	ErrPlanSinExcel = New(403, "PLAN_NO_EXCEL",
		"Tu plan no incluye exportación a Excel.")

	ErrPlanSinAPI = New(403, "PLAN_NO_API",
		"Tu plan no incluye acceso por API.")

	ErrSuscripcionInactiva = New(403, "SUSCRIPCION_INACTIVA",
		"Tu suscripción no está activa. Contacta soporte.")

	ErrSuscripcionVencida = New(403, "SUSCRIPCION_VENCIDA",
		"Tu período de prueba ha expirado. Elige un plan para continuar.")

	ErrOptimisticLock = New(409, "OPTIMISTIC_LOCK",
		"Alguien más editó este registro. Recarga e intenta de nuevo.")
)

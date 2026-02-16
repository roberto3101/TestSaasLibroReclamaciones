package model

import (
	"time"

	"github.com/google/uuid"
)

type Suscripcion struct {
	TenantModel

	PlanID uuid.UUID `json:"plan_id" db:"plan_id"`
	Estado string    `json:"estado" db:"estado"`
	Ciclo  string    `json:"ciclo" db:"ciclo"`

	FechaInicio      time.Time `json:"fecha_inicio" db:"fecha_inicio"`
	FechaFin         NullTime  `json:"fecha_fin" db:"fecha_fin"`
	FechaProximoCobro NullTime `json:"fecha_proximo_cobro" db:"fecha_proximo_cobro"`

	// Trial
	EsTrial       bool     `json:"es_trial" db:"es_trial"`
	DiasTrial     int      `json:"dias_trial" db:"dias_trial"`
	FechaFinTrial NullTime `json:"fecha_fin_trial" db:"fecha_fin_trial"`

	// Overrides
	OverrideMaxSedes     NullInt64 `json:"override_max_sedes" db:"override_max_sedes"`
	OverrideMaxUsuarios  NullInt64 `json:"override_max_usuarios" db:"override_max_usuarios"`
	OverrideMaxReclamos  NullInt64 `json:"override_max_reclamos" db:"override_max_reclamos"`
	OverrideMaxChatbots  NullInt64 `json:"override_max_chatbots" db:"override_max_chatbots"`
	OverrideMaxStorageMB NullInt64 `json:"override_max_storage_mb" db:"override_max_storage_mb"`

	// Pago
	ReferenciaPago NullString `json:"referencia_pago" db:"referencia_pago"`
	MetodoPago     NullString `json:"metodo_pago" db:"metodo_pago"`

	ActivadoPor NullString `json:"activado_por" db:"activado_por"`
	Notas       NullString `json:"notas" db:"notas"`

	FechaCreacion      time.Time `json:"fecha_creacion" db:"fecha_creacion"`
	FechaActualizacion time.Time `json:"fecha_actualizacion" db:"fecha_actualizacion"`
}

// Estados válidos de suscripción.
const (
	SuscripcionActiva    = "ACTIVA"
	SuscripcionTrial     = "TRIAL"
	SuscripcionSuspendida = "SUSPENDIDA"
	SuscripcionCancelada = "CANCELADA"
	SuscripcionVencida   = "VENCIDA"
)

// Ciclos de facturación.
const (
	CicloMensual = "MENSUAL"
	CicloAnual   = "ANUAL"
)

// Orígenes de activación.
const (
	ActivadoPorOnboarding = "ONBOARDING"
	ActivadoPorUpgrade    = "UPGRADE"
	ActivadoPorAdmin      = "ADMIN_MANUAL"
	ActivadoPorRenovacion = "RENOVACION"
)

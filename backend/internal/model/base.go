package model

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// TenantModel campos comunes a TODAS las tablas con tenant_id.
// Embeber en cada model para no repetir.
type TenantModel struct {
	TenantID uuid.UUID `json:"tenant_id" db:"tenant_id"`
	ID       uuid.UUID `json:"id" db:"id"`
}

// Timestamps campos de auditoría temporal.
type Timestamps struct {
	FechaCreacion      time.Time `json:"fecha_creacion" db:"fecha_creacion"`
	FechaActualizacion time.Time `json:"fecha_actualizacion" db:"fecha_actualizacion"`
}

// NullString wrapper de sql.NullString con serialización JSON correcta.
type NullString struct {
	sql.NullString
}

func (ns NullString) MarshalJSON() ([]byte, error) {
	if !ns.Valid {
		return []byte("null"), nil
	}
	b, err := json.Marshal(ns.String)
	return b, err
}

// NullTime wrapper de sql.NullTime con serialización JSON correcta.
type NullTime struct {
	sql.NullTime
}

func (nt NullTime) MarshalJSON() ([]byte, error) {
	if !nt.Valid {
		return []byte("null"), nil
	}
	return []byte(`"` + nt.Time.Format(time.RFC3339) + `"`), nil
}

// NullInt64 wrapper de sql.NullInt64 con serialización JSON correcta.
type NullInt64 struct {
	sql.NullInt64
}

func (ni NullInt64) MarshalJSON() ([]byte, error) {
	if !ni.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(ni.Int64)
}

// NullFloat64 wrapper de sql.NullFloat64 con serialización JSON correcta.
type NullFloat64 struct {
	sql.NullFloat64
}

func (nf NullFloat64) MarshalJSON() ([]byte, error) {
	if !nf.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(nf.Float64)
}

// NullBool wrapper de sql.NullBool con serialización JSON correcta.
type NullBool struct {
	sql.NullBool
}

func (nb NullBool) MarshalJSON() ([]byte, error) {
	if !nb.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(nb.Bool)
}

// NullUUID representa un UUID que puede ser NULL.
type NullUUID struct {
	UUID  uuid.UUID
	Valid bool
}

// Scan implementa sql.Scanner para NullUUID.
func (nu *NullUUID) Scan(value interface{}) error {
	if value == nil {
		nu.UUID = uuid.Nil
		nu.Valid = false
		return nil
	}
	nu.Valid = true
	switch v := value.(type) {
	case []byte:
		parsed, err := uuid.ParseBytes(v)
		if err != nil {
			return err
		}
		nu.UUID = parsed
	case string:
		parsed, err := uuid.Parse(v)
		if err != nil {
			return err
		}
		nu.UUID = parsed
	}
	return nil
}

// Value implementa driver.Valuer para NullUUID.
func (nu NullUUID) Value() (driver.Value, error) {
	if !nu.Valid {
		return nil, nil
	}
	return nu.UUID.String(), nil
}
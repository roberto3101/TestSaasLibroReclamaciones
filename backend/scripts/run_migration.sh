#!/bin/bash
# =============================================================================
# Ejecuta migraciones de la base de datos en CockroachDB
# Uso: ./run_migration.sh [archivo.sql]
# Ejemplo: ./run_migration.sh ../migrations/002_asistente_historial.sql
# =============================================================================

set -e

# --- Configuración (usa las mismas variables del .env) ---
CRDB_HOST="${CRDB_HOST:-localhost}"
CRDB_PORT="${CRDB_PORT:-26257}"
CRDB_USER="${CRDB_USER:-root}"
CRDB_DATABASE="${CRDB_DATABASE:-saaslibroreclamacionesv1}"
CRDB_SSLMODE="${CRDB_SSLMODE:-disable}"

# --- Validar argumento ---
if [ -z "$1" ]; then
    echo "Uso: ./run_migration.sh <archivo.sql>"
    echo "Ejemplo: ./run_migration.sh ../migrations/002_asistente_historial.sql"
    exit 1
fi

SQL_FILE="$1"

if [ ! -f "$SQL_FILE" ]; then
    echo "ERROR: No se encontró el archivo: $SQL_FILE"
    exit 1
fi

# --- Construir connection string ---
if [ -n "$CRDB_PASSWORD" ]; then
    DSN="postgresql://${CRDB_USER}:${CRDB_PASSWORD}@${CRDB_HOST}:${CRDB_PORT}/${CRDB_DATABASE}?sslmode=${CRDB_SSLMODE}"
else
    DSN="postgresql://${CRDB_USER}@${CRDB_HOST}:${CRDB_PORT}/${CRDB_DATABASE}?sslmode=${CRDB_SSLMODE}"
fi

echo "========================================="
echo " Ejecutando migración"
echo " Archivo: $SQL_FILE"
echo " Host:    $CRDB_HOST:$CRDB_PORT"
echo " DB:      $CRDB_DATABASE"
echo "========================================="

# --- Ejecutar ---
cockroach sql --url="$DSN" < "$SQL_FILE"

echo "========================================="
echo " Migración ejecutada correctamente"
echo "========================================="
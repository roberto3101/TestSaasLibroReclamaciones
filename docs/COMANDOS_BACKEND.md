# Backend — Comandos Rápidos

## Requisitos
- Go 1.21+
- CockroachDB corriendo en `localhost:26257`
- Archivo `.env` en `backend/`

## Iniciar backend

```powershell
cd C:\Users\user\Desktop\SaasLibroReclamaciones\backend
go run ./cmd/codeplex_api/
```

Salida esperada:
```
✓ CockroachDB conectado: localhost:26257/saaslibroreclamacionesv1
✓ Servidor iniciado en :8080 [development]
```

## Compilar (sin ejecutar)

```powershell
go build ./...
```

## Tests

```powershell
# Todos los tests
go test ./tests/... -v

# Solo E2E (sin DB)
go test ./tests/e2e/... -v

# Solo integración (requiere CockroachDB)
go test ./tests/integration/... -v
```

## Health check

```
GET http://localhost:8080/health
```

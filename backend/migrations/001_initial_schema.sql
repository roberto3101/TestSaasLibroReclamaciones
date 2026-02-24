-- =============================================================================
-- LIBRO DE RECLAMACIONES - MULTITENANT SaaS (v5 - PLANES + CHATBOTS + ASISTENTE IA)
-- Motor: CockroachDB (Shared Database, Shared Schema)
-- Modelo: Aislamiento Lógico con tenant_id
-- Normativa: D.S. 011-2011-PCM / Ley N° 29571 (INDECOPI)
-- =============================================================================
--
-- PRINCIPIOS DE DISEÑO:
--
--   1.  PK compuesta (tenant_id, id) en TODAS las tablas → CockroachDB agrupa
--       datos del mismo tenant en los mismos ranges/nodos automáticamente.
--
--   2.  Sin TRIGGERS → CockroachDB no los soporta. El backend registra
--       historial, calcula fechas límite y gestiona estados.
--
--   3.  Sin CHECK constraints en columnas de estado/tipo → Se validan en el
--       backend para no bloquear desarrollo ni migraciones futuras.
--
--   4.  FKs compuestas (tenant_id, ref_id) → Mantienen localidad de datos
--       y garantizan que un reclamo no referencie un admin de otro tenant.
--
--   5.  Índices con STORING → Evitan lookups adicionales al disco en las
--       queries más frecuentes (dashboard, listados, reportes).
--
--   6.  Soft deletes (deleted_at) → INDECOPI puede exigir datos históricos.
--       Nunca se borra físicamente un reclamo.
--
--   7.  TTL automático en sesiones y logs de chatbot → CockroachDB limpia
--       filas expiradas sin intervención del backend.
--
--   8.  El tenant_id llega desde un JWT emitido por el login central.
--       Esta DB gestiona planes y suscripciones de forma independiente.
--
--   9.  Tabla de sedes → Por ley (D.S. 011-2011-PCM), cada establecimiento
--       físico debe tener su propio libro de reclamaciones.
--
--   10. Chatbots con API keys → Acceso seguro y auditado a la DB.
--       Lectura completa + escritura limitada (responder, cambiar estado).
--       Rate limiting y permisos granulares por scope.
--
--   11. Planes de suscripción → 4 niveles (DEMO, BRONZE, IRON, GOLD) con
--       límites de sedes, reclamos/mes, usuarios, chatbots y funcionalidades.
--       El backend valida límites ANTES de cada operación.
--
-- =============================================================================


-- =============================================================================
-- LIMPIEZA (solo desarrollo)
-- =============================================================================
DROP VIEW IF EXISTS v_detalle_reclamo CASCADE;
DROP VIEW IF EXISTS v_reclamos_pendientes CASCADE;
DROP VIEW IF EXISTS v_dashboard_reclamos CASCADE;
DROP VIEW IF EXISTS v_uso_tenant CASCADE;
DROP TABLE IF EXISTS chatbot_logs CASCADE;
DROP TABLE IF EXISTS chatbot_api_keys CASCADE;
DROP TABLE IF EXISTS chatbots CASCADE;
DROP TABLE IF EXISTS auditoria_admin CASCADE;
DROP TABLE IF EXISTS sesiones_admin CASCADE;
DROP TABLE IF EXISTS mensajes_seguimiento CASCADE;
DROP TABLE IF EXISTS historial_reclamos CASCADE;
DROP TABLE IF EXISTS respuestas CASCADE;
DROP TABLE IF EXISTS reclamos CASCADE;
DROP TABLE IF EXISTS sedes CASCADE;
DROP TABLE IF EXISTS usuarios_admin CASCADE;
DROP TABLE IF EXISTS suscripciones CASCADE;
DROP TABLE IF EXISTS planes CASCADE;
DROP TABLE IF EXISTS configuracion_tenant CASCADE;
DROP TABLE IF EXISTS asistente_mensajes CASCADE;
DROP TABLE IF EXISTS asistente_conversaciones CASCADE;
DROP TABLE IF EXISTS canales_whatsapp CASCADE;
DROP TABLE IF EXISTS solicitudes_asesor CASCADE;
DROP TABLE IF EXISTS mensajes_atencion CASCADE;
-- =============================================================================
-- 1. PLANES DE SUSCRIPCIÓN
-- =============================================================================
-- Catálogo de planes disponibles. NO tiene tenant_id porque es global.
-- Los planes son los mismos para todos los tenants.
-- Se insertan una vez (seed data) y raramente cambian.
--
-- IMPORTANTE: Esta es la ÚNICA tabla sin tenant_id en la PK.
-- =============================================================================
CREATE TABLE planes (
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),

    codigo                  STRING NOT NULL,          -- DEMO | BRONZE | IRON | GOLD
    nombre                  STRING NOT NULL,          -- "Plan Demo", "Plan Bronze"...
    descripcion             STRING,

-- Precios (en soles S/)
    precio_mensual          DECIMAL(10, 2) NOT NULL DEFAULT 0,
    precio_anual            DECIMAL(10, 2),           -- NULL = no disponible anual
    precio_sede_extra       DECIMAL(10, 2) NOT NULL DEFAULT 0,   -- Precio mensual por sede adicional
    precio_usuario_extra    DECIMAL(10, 2) NOT NULL DEFAULT 0,   -- Precio mensual por usuario adicional

-- === Límites de recursos ===
    max_sedes               INT NOT NULL DEFAULT 1,
    max_usuarios            INT NOT NULL DEFAULT 1,
    max_reclamos_mes        INT NOT NULL DEFAULT 50,  -- -1 = ilimitado
    max_chatbots            INT NOT NULL DEFAULT 0,
    max_canales_whatsapp    INT NOT NULL DEFAULT 0,   -- -1 = ilimitado, 0 = no disponible

    -- === Funcionalidades habilitadas ===
    permite_chatbot         BOOL NOT NULL DEFAULT false,
    permite_whatsapp        BOOL NOT NULL DEFAULT false,
    permite_email           BOOL NOT NULL DEFAULT true,
    permite_reportes_pdf    BOOL NOT NULL DEFAULT false,
    permite_exportar_excel  BOOL NOT NULL DEFAULT false,
    permite_api             BOOL NOT NULL DEFAULT false,
    permite_marca_blanca    BOOL NOT NULL DEFAULT false,  -- Quitar branding de la plataforma
    permite_multi_idioma    BOOL NOT NULL DEFAULT false,
    permite_asistente_ia    BOOL NOT NULL DEFAULT false,  -- Asistente IA interno del panel
    permite_atencion_vivo   BOOL NOT NULL DEFAULT false,  -- Chat en vivo con asesores

    -- Almacenamiento de adjuntos
    max_storage_mb          INT NOT NULL DEFAULT 100,     -- MB totales para adjuntos

    -- Orden de display
    orden                   INT NOT NULL DEFAULT 0,
    activo                  BOOL NOT NULL DEFAULT true,
    destacado               BOOL NOT NULL DEFAULT false,  -- Para resaltar en pricing page

    fecha_creacion          TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (id)
);

-- Código único (solo puede haber un plan DEMO, un BRONZE, etc.)
CREATE UNIQUE INDEX idx_plan_codigo ON planes (codigo);
-- Listado de planes activos para pricing page
CREATE INDEX idx_plan_activo ON planes (activo, orden)
    WHERE activo = true;


-- =============================================================================
-- 2. CONFIGURACION POR TENANT
-- =============================================================================
-- Datos del proveedor/empresa para auto-completar el formulario público.
-- Se insertan al momento del onboarding (cuando la empresa paga y se registra).
-- Una fila por empresa.
-- =============================================================================
CREATE TABLE configuracion_tenant (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),

    -- Datos legales (D.S. 011-2011-PCM, Sección 2)
    razon_social            STRING NOT NULL,
    ruc                     STRING NOT NULL,
    nombre_comercial        STRING,
    direccion_legal         STRING,
    departamento            STRING,
    provincia               STRING,
    distrito                STRING,
    telefono                STRING,
    email_contacto          STRING,

    -- Branding y URL pública
    logo_url                STRING,
    slug                    STRING NOT NULL,     -- URL: tuapp.com/libro/{slug}
    sitio_web               STRING,
    color_primario          STRING DEFAULT '#1a56db',

    -- Configuración del libro
    plazo_respuesta_dias    INT NOT NULL DEFAULT 15,
    mensaje_confirmacion    STRING,
    notificar_whatsapp      BOOL NOT NULL DEFAULT false,
    notificar_email         BOOL NOT NULL DEFAULT true,

    -- Control de estado
    activo                  BOOL NOT NULL DEFAULT true,
    version                 INT NOT NULL DEFAULT 1,  -- Optimistic locking

    -- Timestamps
    fecha_creacion          TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_actualizacion     TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id)
);

-- Slug único global para URLs públicas (libro/polleria-rey)
CREATE UNIQUE INDEX idx_config_slug ON configuracion_tenant (slug);
-- RUC único por tenant (una empresa no se registra dos veces)
CREATE UNIQUE INDEX idx_config_ruc ON configuracion_tenant (tenant_id, ruc);


-- =============================================================================
-- 3. SUSCRIPCIONES
-- =============================================================================
-- Relación entre tenant y plan. Un tenant tiene UNA suscripción activa.
-- Historial de cambios de plan (upgrade/downgrade) se conserva.
--
-- El backend valida límites del plan ANTES de cada operación:
--   if (sedes_actuales >= plan.max_sedes) → rechazar crear sede
--   if (reclamos_este_mes >= plan.max_reclamos_mes) → rechazar reclamo
-- =============================================================================
CREATE TABLE suscripciones (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),

    plan_id                 UUID NOT NULL,

    estado                  STRING NOT NULL DEFAULT 'ACTIVA',
    -- Valores: ACTIVA | SUSPENDIDA | CANCELADA | TRIAL | VENCIDA

    -- Período de facturación
    ciclo                   STRING NOT NULL DEFAULT 'MENSUAL',
    -- Valores: MENSUAL | ANUAL

    fecha_inicio            TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_fin               TIMESTAMPTZ,              -- NULL = sin fecha de fin (auto-renueva)
    fecha_proximo_cobro     DATE,

    -- Trial / Demo
    es_trial                BOOL NOT NULL DEFAULT false,
    dias_trial              INT DEFAULT 0,
    fecha_fin_trial         DATE,

    -- Overrides de límites (para negociaciones especiales)
    -- Si es NULL, usa el límite del plan. Si tiene valor, sobreescribe.
    override_max_sedes      INT,
    override_max_usuarios   INT,
    override_max_reclamos   INT,
    override_max_chatbots   INT,
    override_max_canales_whatsapp INT,
    override_max_storage_mb INT,

    -- Metadata de pago (referencia externa)
    referencia_pago         STRING,                   -- ID de transacción del sistema de pagos
    metodo_pago             STRING,                   -- TARJETA | TRANSFERENCIA | YAPE | PLIN

    -- Quién activó esta suscripción
    activado_por            STRING,                   -- "ONBOARDING" | "UPGRADE" | "ADMIN_MANUAL" | "RENOVACION"
    notas                   STRING,

    fecha_creacion          TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_actualizacion     TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id),

    CONSTRAINT fk_suscripcion_plan
        FOREIGN KEY (plan_id)
        REFERENCES planes (id)
);

-- Suscripción activa de un tenant (la más consultada)
CREATE UNIQUE INDEX idx_suscripcion_activa ON suscripciones (tenant_id)
    STORING (plan_id, estado, ciclo, fecha_fin, fecha_proximo_cobro,
             override_max_sedes, override_max_usuarios, override_max_reclamos,
             override_max_chatbots, override_max_storage_mb)
    WHERE estado IN ('ACTIVA', 'TRIAL');

-- Historial de suscripciones por tenant
CREATE INDEX idx_suscripcion_historial ON suscripciones (tenant_id, fecha_creacion DESC)
    STORING (plan_id, estado, ciclo);

-- Suscripciones próximas a vencer (para cron de alertas)
CREATE INDEX idx_suscripcion_vencimiento ON suscripciones (fecha_proximo_cobro)
    STORING (plan_id, estado)
    WHERE estado = 'ACTIVA';

-- Suscripciones en trial por vencer
CREATE INDEX idx_suscripcion_trial ON suscripciones (fecha_fin_trial)
    STORING (plan_id)
    WHERE es_trial = true AND estado = 'TRIAL';


-- =============================================================================
-- 4. SEDES (establecimientos físicos)
-- =============================================================================
-- Por ley (D.S. 011-2011-PCM), cada establecimiento físico debe tener
-- su propio libro de reclamaciones. Una empresa con 3 locales necesita
-- 3 formularios públicos distintos.
--
-- LÍMITE: El backend debe validar que no exceda plan.max_sedes.
-- =============================================================================
CREATE TABLE sedes (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),

    nombre                  STRING NOT NULL,
    slug                    STRING NOT NULL,
    codigo_sede             STRING,

    -- Dirección del establecimiento (obligatorio por ley)
    direccion               STRING NOT NULL,
    departamento            STRING,
    provincia               STRING,
    distrito                STRING,
    referencia              STRING,

    -- Contacto de la sede
    telefono                STRING,
    email                   STRING,
    responsable_nombre      STRING,
    responsable_cargo       STRING,

    -- Horario (JSONB para flexibilidad)
    horario_atencion        JSONB,

    -- Geolocalización
    latitud                 DECIMAL(10, 7),
    longitud                DECIMAL(10, 7),

    -- Estado
    activo                  BOOL NOT NULL DEFAULT true,
    es_principal            BOOL NOT NULL DEFAULT false,

    -- Timestamps
    fecha_creacion          TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_actualizacion     TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id)
);

CREATE UNIQUE INDEX idx_sede_slug ON sedes (tenant_id, slug);
CREATE UNIQUE INDEX idx_sede_codigo ON sedes (tenant_id, codigo_sede)
    WHERE codigo_sede IS NOT NULL;
CREATE INDEX idx_sede_activa ON sedes (tenant_id, activo)
    STORING (nombre, slug, direccion, distrito)
    WHERE activo = true;
CREATE UNIQUE INDEX idx_sede_principal ON sedes (tenant_id)
    STORING (nombre, slug)
    WHERE es_principal = true;


-- =============================================================================
-- 5. USUARIOS ADMIN (por tenant)
-- =============================================================================
-- LÍMITE: El backend debe validar que no exceda plan.max_usuarios.
-- =============================================================================
CREATE TABLE usuarios_admin (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),

    email                   STRING NOT NULL,
    nombre_completo         STRING NOT NULL,
    password_hash           STRING NOT NULL,
    rol                     STRING NOT NULL DEFAULT 'SOPORTE',
    -- Roles: ADMIN | SOPORTE

    activo                  BOOL NOT NULL DEFAULT true,
    debe_cambiar_password   BOOL NOT NULL DEFAULT true,
    ultimo_acceso           TIMESTAMPTZ,

    -- Sede asignada (NULL = acceso a todas las sedes)
    sede_id                 UUID,

    fecha_creacion          TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por              UUID,

    PRIMARY KEY (tenant_id, id)
);

CREATE UNIQUE INDEX idx_admin_email ON usuarios_admin (tenant_id, email);
CREATE INDEX idx_admin_activo ON usuarios_admin (tenant_id, activo)
    STORING (email, nombre_completo, rol, sede_id)
    WHERE activo = true;
CREATE INDEX idx_admin_sede ON usuarios_admin (tenant_id, sede_id)
    STORING (nombre_completo, rol)
    WHERE sede_id IS NOT NULL AND activo = true;


-- =============================================================================
-- 6. RECLAMOS (tabla principal)
-- =============================================================================
-- LÍMITE: El backend debe validar que reclamos del mes actual
-- no excedan plan.max_reclamos_mes antes de insertar.
-- =============================================================================
CREATE TABLE reclamos (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),

    codigo_reclamo          STRING NOT NULL,
    tipo_solicitud          STRING NOT NULL DEFAULT 'RECLAMO',
    -- Valores: RECLAMO | QUEJA
    estado                  STRING NOT NULL DEFAULT 'PENDIENTE',
    -- Valores: PENDIENTE | EN_PROCESO | RESUELTO | CERRADO

    -- === Sección 1: Datos del consumidor ===
    nombre_completo         STRING NOT NULL,
    tipo_documento          STRING NOT NULL,
    numero_documento        STRING NOT NULL,
    telefono                STRING NOT NULL,
    email                   STRING NOT NULL,
    domicilio               STRING,
    departamento            STRING,
    provincia               STRING,
    distrito                STRING,
    menor_de_edad           BOOL DEFAULT false,
    nombre_apoderado        STRING,

    -- === Sección 2: Datos del proveedor (snapshot) ===
    razon_social_proveedor  STRING,
    ruc_proveedor           STRING,
    direccion_proveedor     STRING,

    -- === Sección 2b: Datos de la sede (snapshot) ===
    sede_id                 UUID,
    sede_nombre             STRING,
    sede_direccion          STRING,

    -- === Sección 3: Bien contratado ===
    tipo_bien               STRING,
    monto_reclamado         DECIMAL(12, 2) DEFAULT 0,
    descripcion_bien        STRING NOT NULL,
    numero_pedido           STRING,

    -- === Campos específicos para QUEJA ===
    area_queja              STRING,
    descripcion_situacion   STRING,

    -- === Sección 4: Detalle ===
    fecha_incidente         DATE NOT NULL,
    detalle_reclamo         STRING NOT NULL,
    pedido_consumidor       STRING NOT NULL,

    -- === Firma y metadatos ===
    firma_digital           STRING,
    ip_address              STRING,
    user_agent              STRING,

    -- === Conformidad ===
    acepta_terminos         BOOL NOT NULL DEFAULT true,
    acepta_copia            BOOL NOT NULL DEFAULT true,

    -- === Fechas ===
    fecha_registro          TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_limite_respuesta  DATE,
    fecha_respuesta         TIMESTAMPTZ,
    fecha_cierre            TIMESTAMPTZ,

    -- === Gestión interna ===
    atendido_por            UUID,
    canal_origen            STRING DEFAULT 'WEB',
    -- Valores: WEB | APP | PRESENCIAL | QR | CHATBOT

    -- === Soft delete ===
    deleted_at              TIMESTAMPTZ,

    PRIMARY KEY (tenant_id, id),

    CONSTRAINT fk_reclamo_sede
        FOREIGN KEY (tenant_id, sede_id)
        REFERENCES sedes (tenant_id, id)
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_reclamo_codigo ON reclamos (tenant_id, codigo_reclamo);
CREATE INDEX idx_reclamo_dashboard ON reclamos (tenant_id, estado, fecha_registro DESC)
    STORING (tipo_solicitud, nombre_completo, codigo_reclamo, fecha_limite_respuesta, atendido_por, sede_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_reclamo_tipo ON reclamos (tenant_id, tipo_solicitud)
    STORING (estado, nombre_completo, fecha_registro, sede_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_reclamo_atendido ON reclamos (tenant_id, atendido_por)
    STORING (estado, codigo_reclamo, nombre_completo, sede_id)
    WHERE atendido_por IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_reclamo_documento ON reclamos (tenant_id, numero_documento)
    STORING (nombre_completo, email, estado);
CREATE INDEX idx_reclamo_email ON reclamos (tenant_id, email)
    STORING (nombre_completo, numero_documento, estado);
CREATE INDEX idx_reclamo_vencimiento ON reclamos (tenant_id, fecha_limite_respuesta)
    STORING (codigo_reclamo, nombre_completo, estado, sede_id)
    WHERE estado IN ('PENDIENTE', 'EN_PROCESO') AND deleted_at IS NULL;
CREATE INDEX idx_reclamo_reportes ON reclamos (tenant_id, fecha_registro DESC, estado)
    STORING (tipo_solicitud, monto_reclamado, canal_origen, sede_id)
    WHERE estado != 'CERRADO' AND deleted_at IS NULL;
CREATE INDEX idx_reclamo_pedido ON reclamos (tenant_id, numero_pedido)
    WHERE numero_pedido IS NOT NULL;
CREATE INDEX idx_reclamo_sede ON reclamos (tenant_id, sede_id, fecha_registro DESC)
    STORING (estado, codigo_reclamo, nombre_completo, tipo_solicitud)
    WHERE sede_id IS NOT NULL AND deleted_at IS NULL;

-- Conteo mensual para validar límite del plan
CREATE INDEX idx_reclamo_conteo_mes ON reclamos (tenant_id, fecha_registro)
    WHERE deleted_at IS NULL;


-- =============================================================================
-- 7. RESPUESTAS
-- =============================================================================
CREATE TABLE respuestas (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),
    reclamo_id              UUID NOT NULL,

    respuesta_empresa       STRING NOT NULL,
    accion_tomada           STRING,
    compensacion_ofrecida   STRING,

    respondido_por          UUID,
    cargo_responsable       STRING,

    archivos_adjuntos       JSONB,

    notificado_cliente      BOOL NOT NULL DEFAULT false,
    canal_notificacion      STRING,
    fecha_notificacion      TIMESTAMPTZ,

    -- Origen de la respuesta
    origen                  STRING NOT NULL DEFAULT 'PANEL',
    -- Valores: PANEL | CHATBOT | API
    chatbot_id              UUID,        -- Si fue generada por un chatbot

    fecha_respuesta         TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id),

    CONSTRAINT fk_respuesta_reclamo
        FOREIGN KEY (tenant_id, reclamo_id)
        REFERENCES reclamos (tenant_id, id)
        ON DELETE CASCADE
);

CREATE INDEX idx_respuesta_reclamo ON respuestas (tenant_id, reclamo_id, fecha_respuesta DESC)
    STORING (respuesta_empresa, respondido_por, notificado_cliente, origen);


-- =============================================================================
-- 8. HISTORIAL DE RECLAMOS (trazabilidad)
-- =============================================================================
CREATE TABLE historial_reclamos (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),
    reclamo_id              UUID NOT NULL,

    estado_anterior         STRING,
    estado_nuevo            STRING NOT NULL,
    tipo_accion             STRING NOT NULL,
    -- Valores: CREACION | CAMBIO_ESTADO | RESPUESTA | ASIGNACION
    --          NOTIFICACION | REAPERTURA | CHATBOT_RESPUESTA

    comentario              STRING,
    usuario_accion          UUID,
    chatbot_id              UUID,        -- Si la acción fue del chatbot
    ip_address              STRING,

    fecha_accion            TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id),

    CONSTRAINT fk_historial_reclamo
        FOREIGN KEY (tenant_id, reclamo_id)
        REFERENCES reclamos (tenant_id, id)
        ON DELETE CASCADE
);

CREATE INDEX idx_historial_reclamo ON historial_reclamos (tenant_id, reclamo_id, fecha_accion DESC)
    STORING (estado_anterior, estado_nuevo, tipo_accion, usuario_accion, chatbot_id);
CREATE INDEX idx_historial_fecha ON historial_reclamos (tenant_id, fecha_accion DESC)
    STORING (reclamo_id, tipo_accion, estado_nuevo);


-- =============================================================================
-- 9. MENSAJES DE SEGUIMIENTO
-- =============================================================================
CREATE TABLE mensajes_seguimiento (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),
    reclamo_id              UUID NOT NULL,

    tipo_mensaje            STRING NOT NULL,
    -- Valores: CLIENTE | EMPRESA | CHATBOT

    mensaje                 STRING NOT NULL,

    archivo_url             STRING,
    archivo_nombre          STRING,

    leido                   BOOL NOT NULL DEFAULT false,
    fecha_lectura           TIMESTAMPTZ,

    chatbot_id              UUID,        -- Si el mensaje lo generó un chatbot

    fecha_mensaje           TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id),

    CONSTRAINT fk_mensaje_reclamo
        FOREIGN KEY (tenant_id, reclamo_id)
        REFERENCES reclamos (tenant_id, id)
        ON DELETE CASCADE
);

CREATE INDEX idx_mensaje_reclamo ON mensajes_seguimiento (tenant_id, reclamo_id, fecha_mensaje DESC)
    STORING (tipo_mensaje, mensaje, leido, chatbot_id);
CREATE INDEX idx_mensaje_no_leido ON mensajes_seguimiento (tenant_id, reclamo_id)
    STORING (tipo_mensaje, fecha_mensaje)
    WHERE leido = false;


-- =============================================================================
-- 10. CHATBOTS
-- =============================================================================
-- Configuración de chatbots por tenant. Un chatbot es una integración
-- externa (IA, WhatsApp bot, Telegram bot, etc.) que interactúa con
-- los reclamos de forma automatizada.
--
-- El chatbot accede vía API keys con scopes específicos.
-- LÍMITE: El backend valida que no exceda plan.max_chatbots.
-- =============================================================================
CREATE TABLE chatbots (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),

    nombre                  STRING NOT NULL,          -- "Asistente IA de Reclamos"
    descripcion             STRING,

    tipo                    STRING NOT NULL DEFAULT 'ASISTENTE_IA',
    -- Valores: ASISTENTE_IA | WHATSAPP_BOT | TELEGRAM_BOT | CUSTOM

    -- Configuración del comportamiento
    modelo_ia               STRING,                   -- "gpt-4o" | "claude-sonnet" | etc.
    prompt_sistema          STRING,                   -- Prompt base para el chatbot
    temperatura             DECIMAL(3, 2) DEFAULT 0.3,
    max_tokens_respuesta    INT DEFAULT 500,

    -- Permisos (scopes) — qué puede hacer el chatbot
    puede_leer_reclamos     BOOL NOT NULL DEFAULT true,
    puede_responder         BOOL NOT NULL DEFAULT false,  -- Crear respuestas
    puede_cambiar_estado    BOOL NOT NULL DEFAULT false,  -- Mover de PENDIENTE a EN_PROCESO
    puede_enviar_mensajes   BOOL NOT NULL DEFAULT true,   -- Mensajes de seguimiento
    puede_leer_metricas     BOOL NOT NULL DEFAULT true,   -- Dashboard y reportes

    -- Restricciones operativas
    requiere_aprobacion     BOOL NOT NULL DEFAULT true,   -- Las respuestas del bot quedan como "borrador"
    max_respuestas_dia      INT DEFAULT 100,              -- Rate limit diario
    horario_activo          JSONB,                        -- {"inicio": "08:00", "fin": "20:00"}
    sedes_permitidas        JSONB,                        -- ["sede-uuid-1", "sede-uuid-2"] NULL = todas

    -- Estado
    activo                  BOOL NOT NULL DEFAULT true,
    creado_por              UUID,                         -- usuarios_admin.id

    -- Timestamps
    fecha_creacion          TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_actualizacion     TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id)
);

CREATE INDEX idx_chatbot_activo ON chatbots (tenant_id, activo)
    STORING (nombre, tipo)
    WHERE activo = true;


-- =============================================================================
-- 11. CHATBOT API KEYS
-- =============================================================================
-- Cada chatbot puede tener múltiples API keys (rotación de credenciales).
-- La key se hashea con SHA256 — nunca se almacena en texto plano.
--
-- Flujo de autenticación:
--   1. El chatbot envía: Authorization: Bearer crb_live_abc123...
--   2. El backend hashea el token → SHA256("crb_live_abc123...")
--   3. Busca en esta tabla por key_hash
--   4. Valida: activa=true, no expirada, dentro de rate limit
--   5. Extrae tenant_id y chatbot_id → los inyecta en el contexto
--
-- Formato del token: crb_{entorno}_{random}
--   crb_live_a1b2c3d4e5f6...  (producción)
--   crb_test_x9y8z7w6v5u4...  (testing)
-- =============================================================================
CREATE TABLE chatbot_api_keys (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),
    chatbot_id              UUID NOT NULL,

    nombre                  STRING NOT NULL,          -- "Key producción v1"
    key_prefix              STRING NOT NULL,          -- "crb_live_a1b2" (primeros 12 chars, para identificar)
    key_hash                STRING NOT NULL,          -- SHA256 del token completo

    entorno                 STRING NOT NULL DEFAULT 'LIVE',
    -- Valores: LIVE | TEST

    -- Seguridad
    activa                  BOOL NOT NULL DEFAULT true,
    fecha_expiracion        TIMESTAMPTZ,              -- NULL = no expira
    ips_permitidas          JSONB,                    -- ["190.42.10.5", "10.0.0.0/8"] NULL = cualquier IP
    ultimo_uso              TIMESTAMPTZ,

    -- Rate limiting
    requests_por_minuto     INT NOT NULL DEFAULT 60,
    requests_por_dia        INT NOT NULL DEFAULT 5000,

    -- Timestamps
    fecha_creacion          TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por              UUID,                     -- usuarios_admin.id

    PRIMARY KEY (tenant_id, id),

    CONSTRAINT fk_apikey_chatbot
        FOREIGN KEY (tenant_id, chatbot_id)
        REFERENCES chatbots (tenant_id, id)
        ON DELETE CASCADE
);

-- Lookup de autenticación (la query más crítica de las API keys)
CREATE INDEX idx_apikey_hash ON chatbot_api_keys (key_hash)
    STORING (chatbot_id, activa, fecha_expiracion, ips_permitidas,
             requests_por_minuto, requests_por_dia, entorno)
    WHERE activa = true;

-- Keys por chatbot
CREATE INDEX idx_apikey_chatbot ON chatbot_api_keys (tenant_id, chatbot_id)
    STORING (nombre, key_prefix, activa, entorno, ultimo_uso)
    WHERE activa = true;

-- Identificación por prefijo (para que el admin identifique qué key es)
CREATE INDEX idx_apikey_prefix ON chatbot_api_keys (tenant_id, key_prefix);


-- =============================================================================
-- 12. CHATBOT LOGS
-- =============================================================================
-- Log de TODAS las llamadas API de los chatbots. Sirve para:
--   - Auditoría de seguridad
--   - Debugging
--   - Monitoreo de rate limits
--   - Facturación por uso (si se implementa en el futuro)
--
-- TTL: Los logs se eliminan automáticamente después de 90 días.
-- Para auditoría de largo plazo, exportar a almacenamiento externo.
-- =============================================================================
CREATE TABLE chatbot_logs (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),
    chatbot_id              UUID NOT NULL,
    api_key_id              UUID NOT NULL,

    -- Request
    metodo                  STRING NOT NULL,          -- GET | POST | PUT | PATCH
    endpoint                STRING NOT NULL,          -- "/api/v1/reclamos" | "/api/v1/respuestas"
    request_body            JSONB,                    -- Body resumido (sin datos sensibles)

    -- Response
    status_code             INT NOT NULL,             -- 200 | 400 | 401 | 403 | 429 | 500
    response_body           JSONB,                    -- Respuesta resumida

    -- Contexto
    ip_address              STRING,
    duracion_ms             INT,                      -- Tiempo de respuesta
    reclamo_id              UUID,                     -- Si la acción fue sobre un reclamo
    accion                  STRING,                   -- LEER_RECLAMO | LISTAR_RECLAMOS | RESPONDER | CAMBIAR_ESTADO | LEER_METRICAS

    -- Rate limiting
    fue_rate_limited        BOOL NOT NULL DEFAULT false,

    -- TTL: auto-eliminar después de 90 días
    fecha_expiracion        TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '90 days',

    fecha                   TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id)
)
WITH (ttl_expiration_expression = 'fecha_expiracion', ttl_job_cron = '@daily');

-- Logs de un chatbot específico (debugging)
CREATE INDEX idx_chatlog_chatbot ON chatbot_logs (tenant_id, chatbot_id, fecha DESC)
    STORING (endpoint, status_code, accion, duracion_ms);

-- Logs por reclamo (ver qué hizo el bot con un reclamo)
CREATE INDEX idx_chatlog_reclamo ON chatbot_logs (tenant_id, reclamo_id, fecha DESC)
    STORING (chatbot_id, accion, status_code)
    WHERE reclamo_id IS NOT NULL;

-- Errores recientes (monitoreo)
CREATE INDEX idx_chatlog_errores ON chatbot_logs (tenant_id, fecha DESC)
    STORING (chatbot_id, endpoint, status_code, accion)
    WHERE status_code >= 400;

-- Rate limit tracking (requests del último minuto/día)
CREATE INDEX idx_chatlog_rate ON chatbot_logs (tenant_id, api_key_id, fecha DESC)
    WHERE fue_rate_limited = false;


-- =============================================================================
-- 13. SESIONES ADMIN
-- =============================================================================
CREATE TABLE sesiones_admin (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),
    usuario_id              UUID NOT NULL,

    token_hash              STRING NOT NULL,
    ip_address              STRING,
    user_agent              STRING,
    activa                  BOOL NOT NULL DEFAULT true,

    fecha_inicio            TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_expiracion        TIMESTAMPTZ NOT NULL,

    PRIMARY KEY (tenant_id, id),

    CONSTRAINT fk_sesion_usuario
        FOREIGN KEY (tenant_id, usuario_id)
        REFERENCES usuarios_admin (tenant_id, id)
        ON DELETE CASCADE
)
WITH (ttl_expiration_expression = 'fecha_expiracion', ttl_job_cron = '@hourly');

CREATE INDEX idx_sesion_token ON sesiones_admin (token_hash)
    STORING (usuario_id, activa, fecha_expiracion)
    WHERE activa = true;
CREATE INDEX idx_sesion_usuario ON sesiones_admin (tenant_id, usuario_id)
    STORING (fecha_inicio, fecha_expiracion, activa)
    WHERE activa = true;


-- =============================================================================
-- 14. AUDITORIA ADMIN
-- =============================================================================
CREATE TABLE auditoria_admin (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),
    usuario_id              UUID NOT NULL,

    accion                  STRING NOT NULL,
    -- Valores: LOGIN | LOGOUT | CREAR_RECLAMO | RESPONDER | CAMBIAR_ESTADO
    --          ASIGNAR | EXPORTAR | CONFIGURAR | CREAR_USUARIO | DESACTIVAR_USUARIO
    --          CREAR_CHATBOT | GENERAR_API_KEY | REVOCAR_API_KEY
    --          CAMBIAR_PLAN | ACTIVAR_SUSCRIPCION | CANCELAR_SUSCRIPCION

    entidad                 STRING NOT NULL,
    -- Valores: RECLAMO | RESPUESTA | USUARIO | CONFIG | SESION | SEDE
    --          CHATBOT | API_KEY | SUSCRIPCION | PLAN

    entidad_id              STRING,
    detalles                JSONB,

    ip_address              STRING,

    fecha                   TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id),

    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (tenant_id, usuario_id)
        REFERENCES usuarios_admin (tenant_id, id)
        ON DELETE CASCADE
);

CREATE INDEX idx_auditoria_fecha ON auditoria_admin (tenant_id, fecha DESC)
    STORING (usuario_id, accion, entidad, entidad_id);
CREATE INDEX idx_auditoria_usuario ON auditoria_admin (tenant_id, usuario_id, fecha DESC)
    STORING (accion, entidad, entidad_id);
CREATE INDEX idx_auditoria_entidad ON auditoria_admin (tenant_id, entidad, entidad_id)
    STORING (accion, usuario_id, fecha);


-- =============================================================================
-- VISTAS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Dashboard de métricas por tenant/sede
-- ---------------------------------------------------------------------------
CREATE VIEW v_dashboard_reclamos AS
SELECT
    tenant_id,
    sede_id,
    COUNT(*)                                                            AS total,
    COUNT(*) FILTER (WHERE estado = 'PENDIENTE')                        AS pendientes,
    COUNT(*) FILTER (WHERE estado = 'EN_PROCESO')                       AS en_proceso,
    COUNT(*) FILTER (WHERE estado = 'RESUELTO')                         AS resueltos,
    COUNT(*) FILTER (WHERE estado = 'CERRADO')                          AS cerrados,
    COUNT(*) FILTER (WHERE tipo_solicitud = 'RECLAMO')                  AS total_reclamos,
    COUNT(*) FILTER (WHERE tipo_solicitud = 'QUEJA')                    AS total_quejas,
    COUNT(*) FILTER (WHERE
        fecha_limite_respuesta < CURRENT_DATE
        AND estado IN ('PENDIENTE', 'EN_PROCESO'))                      AS vencidos,
    COUNT(*) FILTER (WHERE
        fecha_registro >= CURRENT_DATE - INTERVAL '7 days')             AS ultimos_7_dias,
    COUNT(*) FILTER (WHERE
        fecha_registro >= DATE_TRUNC('month', CURRENT_DATE))            AS este_mes,
    ROUND(AVG(
        CASE
            WHEN estado IN ('RESUELTO', 'CERRADO') AND fecha_respuesta IS NOT NULL
            THEN EXTRACT(EPOCH FROM (fecha_respuesta - fecha_registro)) / 86400.0
        END
    )::NUMERIC, 1)                                                      AS promedio_dias_resolucion
FROM reclamos
WHERE deleted_at IS NULL
GROUP BY tenant_id, sede_id;

-- ---------------------------------------------------------------------------
-- Reclamos pendientes con prioridad
-- ---------------------------------------------------------------------------
CREATE VIEW v_reclamos_pendientes AS
SELECT
    r.tenant_id,
    r.id,
    r.codigo_reclamo,
    r.tipo_solicitud,
    r.nombre_completo,
    r.email,
    r.telefono,
    r.descripcion_bien,
    r.fecha_registro,
    r.fecha_limite_respuesta,
    r.atendido_por,
    r.canal_origen,
    r.sede_id,
    r.sede_nombre,
    (r.fecha_limite_respuesta - CURRENT_DATE)   AS dias_restantes,
    CASE
        WHEN r.fecha_limite_respuesta < CURRENT_DATE THEN 'VENCIDO'
        WHEN (r.fecha_limite_respuesta - CURRENT_DATE) <= 3 THEN 'URGENTE'
        ELSE 'NORMAL'
    END                                         AS prioridad
FROM reclamos r
WHERE r.estado IN ('PENDIENTE', 'EN_PROCESO')
  AND r.deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Detalle completo de un reclamo
-- ---------------------------------------------------------------------------
CREATE VIEW v_detalle_reclamo AS
SELECT
    r.tenant_id,
    r.id,
    r.codigo_reclamo,
    r.tipo_solicitud,
    r.estado,
    r.nombre_completo,
    r.tipo_documento,
    r.numero_documento,
    r.email,
    r.telefono,
    r.domicilio,
    r.menor_de_edad,
    r.nombre_apoderado,
    r.razon_social_proveedor,
    r.ruc_proveedor,
    r.direccion_proveedor,
    r.sede_id,
    r.sede_nombre,
    r.sede_direccion,
    r.tipo_bien,
    r.descripcion_bien,
    r.monto_reclamado,
    r.numero_pedido,
    r.fecha_incidente,
    r.detalle_reclamo,
    r.pedido_consumidor,
    r.canal_origen,
    r.fecha_registro,
    r.fecha_limite_respuesta,
    r.fecha_respuesta,
    r.fecha_cierre,
    r.atendido_por,
    ua.nombre_completo                          AS admin_asignado,
    (r.fecha_limite_respuesta - CURRENT_DATE)   AS dias_restantes,
    CASE
        WHEN r.estado IN ('RESUELTO', 'CERRADO') THEN 'COMPLETADO'
        WHEN r.fecha_limite_respuesta < CURRENT_DATE THEN 'VENCIDO'
        WHEN (r.fecha_limite_respuesta - CURRENT_DATE) <= 3 THEN 'URGENTE'
        ELSE 'EN_TIEMPO'
    END                                         AS prioridad,
    resp.respuesta_empresa                      AS ultima_respuesta,
    resp.accion_tomada                          AS ultima_accion,
    resp.compensacion_ofrecida                  AS ultima_compensacion,
    resp.fecha_respuesta                        AS fecha_ultima_respuesta
FROM reclamos r
LEFT JOIN usuarios_admin ua
    ON r.tenant_id = ua.tenant_id AND r.atendido_por = ua.id
LEFT JOIN LATERAL (
    SELECT rp.respuesta_empresa, rp.accion_tomada, rp.compensacion_ofrecida, rp.fecha_respuesta
    FROM respuestas rp
    WHERE rp.tenant_id = r.tenant_id AND rp.reclamo_id = r.id
    ORDER BY rp.fecha_respuesta DESC
    LIMIT 1
) resp ON true
WHERE r.deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Uso actual del tenant vs límites del plan (para validaciones)
-- Uso: SELECT * FROM v_uso_tenant WHERE tenant_id = $1
-- ---------------------------------------------------------------------------
CREATE VIEW v_uso_tenant AS
SELECT
    ct.tenant_id,
    -- Plan actual
    p.id                                        AS plan_id,
    p.codigo                                    AS plan_codigo,
    p.nombre                                    AS plan_nombre,
    s.id                                        AS suscripcion_id,
    s.estado                                    AS suscripcion_estado,
    s.ciclo                                     AS suscripcion_ciclo,
    s.es_trial                                  AS suscripcion_es_trial,
    s.fecha_inicio                              AS suscripcion_fecha_inicio,
    s.fecha_fin                                 AS suscripcion_fecha_fin,
    s.fecha_fin_trial                           AS suscripcion_fecha_fin_trial,
    s.fecha_proximo_cobro                       AS suscripcion_proximo_cobro,
    -- Límites efectivos (override > plan, -1 = ilimitado)
    COALESCE(s.override_max_sedes, p.max_sedes)                         AS limite_sedes,
    COALESCE(s.override_max_usuarios, p.max_usuarios)                   AS limite_usuarios,
    COALESCE(s.override_max_reclamos, p.max_reclamos_mes)               AS limite_reclamos_mes,
    COALESCE(s.override_max_chatbots, p.max_chatbots)                   AS limite_chatbots,
    COALESCE(s.override_max_canales_whatsapp, p.max_canales_whatsapp)   AS limite_canales_whatsapp,
    COALESCE(s.override_max_storage_mb, p.max_storage_mb)               AS limite_storage_mb,
    -- Funcionalidades
    p.permite_chatbot,
    p.permite_whatsapp,
    p.permite_email,
    p.permite_reportes_pdf,
    p.permite_exportar_excel,
    p.permite_api,
    p.permite_marca_blanca,
    p.permite_multi_idioma,
    p.permite_asistente_ia,
    p.permite_atencion_vivo,
    -- Uso actual
    (SELECT COUNT(*) FROM sedes sd
     WHERE sd.tenant_id = ct.tenant_id AND sd.activo = true)                AS uso_sedes,
    (SELECT COUNT(*) FROM usuarios_admin ua
     WHERE ua.tenant_id = ct.tenant_id AND ua.activo = true)                AS uso_usuarios,
    (SELECT COUNT(*) FROM reclamos r
     WHERE r.tenant_id = ct.tenant_id
       AND r.deleted_at IS NULL
       AND r.fecha_registro >= DATE_TRUNC('month', CURRENT_DATE))           AS uso_reclamos_mes,
    (SELECT COUNT(*) FROM chatbots cb
     WHERE cb.tenant_id = ct.tenant_id AND cb.activo = true)                AS uso_chatbots,
    (SELECT COUNT(*) FROM canales_whatsapp cw
     WHERE cw.tenant_id = ct.tenant_id AND cw.activo = true)               AS uso_canales_whatsapp
FROM configuracion_tenant ct
JOIN suscripciones s ON s.tenant_id = ct.tenant_id AND s.estado IN ('ACTIVA', 'TRIAL')
JOIN planes p ON p.id = s.plan_id;


-- =============================================================================
-- SEED DATA: Planes por defecto
-- =============================================================================
INSERT INTO planes (
    codigo, nombre, descripcion,
    precio_mensual, precio_anual, precio_sede_extra, precio_usuario_extra,
    max_sedes, max_usuarios, max_reclamos_mes, max_chatbots, max_canales_whatsapp,
    permite_chatbot, permite_whatsapp, permite_email,
    permite_reportes_pdf, permite_exportar_excel, permite_api,
    permite_marca_blanca, permite_multi_idioma,
    permite_asistente_ia, permite_atencion_vivo,
    max_storage_mb, orden, activo, destacado
) VALUES
    ('DEMO', 'Plan Demo',
     'Prueba gratuita por 15 días. Conoce todas las funcionalidades.',
     0, NULL, 0, 0,
     1, 1, 20, 0, 0,
     false, false, true,
     false, false, false,
     false, false,
     false, false,
     50, 1, true, false),

    ('EMPRENDEDOR', 'Plan Emprendedor',
     'Ideal para emprendedores y negocios pequeños con una sede.',
     19.90, 179.90, 20.00, 15.00,
     3, 1, -1, 1, 1,
     true, true, true,
     true, true, false,
     false, false,
     true, true,
     200, 2, true, false),

    ('PYME', 'Plan PYME',
     'El favorito de las PYMEs. Múltiples sedes y usuarios.',
     44.90, 449.90, 20.00, 10.00,
     15, 5, -1, 2, 3,
     true, true, true,
     true, true, true,
     false, false,
     true, true,
     1000, 3, true, true),

    ('PRO', 'Plan Pro',
     'Para empresas establecidas. Sin límites operativos. Marca blanca incluida.',
     84.90, 899.90, 15.00, 8.00,
     50, 10, -1, 5, 10,
     true, true, true,
     true, true, true,
     true, true,
     true, true,
     10000, 4, true, false);


-- =============================================================================
-- COMENTARIOS
-- =============================================================================
COMMENT ON TABLE planes IS 'Catálogo global de planes. Sin tenant_id. Se insertan una vez como seed data.';
COMMENT ON TABLE suscripciones IS 'Relación tenant-plan. Una suscripción activa por tenant. Los overrides permiten negociaciones especiales.';
COMMENT ON TABLE configuracion_tenant IS 'Datos del proveedor por empresa. Una fila por tenant. Campo version para optimistic locking.';
COMMENT ON TABLE sedes IS 'Establecimientos físicos. Límite controlado por plan.max_sedes.';
COMMENT ON TABLE usuarios_admin IS 'Admins del panel. Límite controlado por plan.max_usuarios.';
COMMENT ON TABLE reclamos IS 'Reclamos y quejas. Límite mensual controlado por plan.max_reclamos_mes. Soft delete con deleted_at.';
COMMENT ON TABLE respuestas IS 'Respuestas de la empresa. Campo origen indica si fue PANEL, CHATBOT o API.';
COMMENT ON TABLE historial_reclamos IS 'Trazabilidad de cambios. Insert-only. Registra acciones de admins y chatbots.';
COMMENT ON TABLE mensajes_seguimiento IS 'Chat de seguimiento. Tipo CHATBOT para mensajes automáticos.';
COMMENT ON TABLE chatbots IS 'Configuración de chatbots por tenant. Permisos granulares por scope. Límite controlado por plan.max_chatbots.';
COMMENT ON TABLE chatbot_api_keys IS 'API keys hasheadas con SHA256. Nunca almacenar en texto plano. Formato: crb_{entorno}_{random}.';
COMMENT ON TABLE chatbot_logs IS 'Log de llamadas API. TTL de 90 días. Para auditoría y rate limiting.';
COMMENT ON TABLE sesiones_admin IS 'Sesiones JWT con TTL automático.';
COMMENT ON TABLE auditoria_admin IS 'Log inmutable de acciones administrativas.';

COMMENT ON COLUMN suscripciones.override_max_sedes IS 'Sobreescribe plan.max_sedes para este tenant. NULL = usa límite del plan.';
COMMENT ON COLUMN chatbot_api_keys.key_hash IS 'SHA256 del token. El token original solo se muestra UNA vez al crearse.';
COMMENT ON COLUMN chatbot_api_keys.key_prefix IS 'Primeros 12 caracteres del token. Para que el admin identifique qué key es sin exponer el secreto.';
COMMENT ON COLUMN chatbots.requiere_aprobacion IS 'Si es true, las respuestas del bot quedan como borrador hasta que un admin las apruebe.';
COMMENT ON COLUMN chatbot_logs.fecha_expiracion IS 'TTL de 90 días. CockroachDB elimina automáticamente los logs viejos.';
COMMENT ON COLUMN planes.max_reclamos_mes IS '-1 significa ilimitado. El backend debe interpretar -1 como sin límite.';
COMMENT ON COLUMN reclamos.canal_origen IS 'CHATBOT indica que el reclamo fue registrado por un bot (ej: WhatsApp bot recibe el reclamo).';
-- NOTA: CockroachDB no soporta COMMENT ON VIEW.
-- v_uso_tenant: Vista de uso actual vs límites del plan. El backend la consulta antes de crear sedes, usuarios, chatbots o reclamos.


-- =============================================================================
-- FIN DEL SCHEMA v4
-- =============================================================================






-- =============================================================================
-- MIGRACIÓN: Historial del Asistente IA
-- Ejecutar DESPUÉS del schema base (v4)
-- =============================================================================
--
-- Agrega 2 tablas para persistir conversaciones del asistente interno.
-- Sigue los mismos principios del schema base:
--   - PK compuesta (tenant_id, id)
--   - FKs compuestas con CASCADE
--   - TTL automático de CockroachDB (7 días)
--   - Sin triggers
--
-- Límites:
--   - Máximo 10 conversaciones activas por usuario (el backend borra la más vieja)
--   - Máximo 50 mensajes por conversación (el backend rechaza después de 50)
--   - Las conversaciones expiran a los 7 días automáticamente (TTL)
--
-- =============================================================================


-- =============================================================================
-- 15. ASISTENTE IA — CONVERSACIONES
-- =============================================================================
-- Una conversación es una sesión de chat entre un usuario admin y el asistente.
-- Se auto-eliminan después de 7 días con TTL de CockroachDB.
-- El backend limita a 10 conversaciones por usuario: al crear la 11va,
-- borra la más vieja con un DELETE inline (sin crons ni jobs).
-- =============================================================================
CREATE TABLE IF NOT EXISTS asistente_conversaciones (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),
    usuario_id              UUID NOT NULL,

    titulo                  STRING NOT NULL DEFAULT 'Nueva conversación',
    -- Se auto-genera del primer mensaje del usuario (primeros 80 chars)

    activa                  BOOL NOT NULL DEFAULT true,

    -- Contadores (se actualizan en el backend al insertar mensajes)
    total_mensajes          INT NOT NULL DEFAULT 0,
    total_tokens_prompt     INT NOT NULL DEFAULT 0,
    total_tokens_output     INT NOT NULL DEFAULT 0,
    proveedor_ia            STRING,          -- "ollama/llama3.1" | "anthropic" | etc.

    -- TTL: auto-eliminar después de 7 días
    fecha_expiracion        TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',

    fecha_creacion          TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_actualizacion     TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id),

    CONSTRAINT fk_asistente_conv_usuario
        FOREIGN KEY (tenant_id, usuario_id)
        REFERENCES usuarios_admin (tenant_id, id)
        ON DELETE CASCADE
)
WITH (ttl_expiration_expression = 'fecha_expiracion', ttl_job_cron = '@hourly');

-- Conversaciones activas de un usuario (la query más frecuente)
CREATE INDEX IF NOT EXISTS idx_asistente_conv_usuario
    ON asistente_conversaciones (tenant_id, usuario_id, fecha_actualizacion DESC)
    STORING (titulo, activa, total_mensajes, proveedor_ia)
    WHERE activa = true;


-- =============================================================================
-- 16. ASISTENTE IA — MENSAJES
-- =============================================================================
-- Mensajes individuales de cada conversación.
-- CASCADE delete con la conversación padre (si se borra la conversación,
-- se borran todos sus mensajes automáticamente).
-- =============================================================================
CREATE TABLE IF NOT EXISTS asistente_mensajes (
    tenant_id               UUID NOT NULL,
    id                      UUID NOT NULL DEFAULT gen_random_uuid(),
    conversacion_id         UUID NOT NULL,

    rol                     STRING NOT NULL,
    -- Valores: USER | ASSISTANT

    contenido               STRING NOT NULL,

    -- Métricas de la respuesta de IA (solo para rol=ASSISTANT)
    tokens_prompt           INT DEFAULT 0,
    tokens_output           INT DEFAULT 0,
    proveedor               STRING,          -- "ollama/llama3.1", "anthropic", etc.
    duracion_ms             INT,             -- Tiempo de respuesta en ms

    fecha_creacion          TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id),

    CONSTRAINT fk_asistente_msg_conv
        FOREIGN KEY (tenant_id, conversacion_id)
        REFERENCES asistente_conversaciones (tenant_id, id)
        ON DELETE CASCADE
);

-- Mensajes de una conversación ordenados (la query principal)
CREATE INDEX IF NOT EXISTS idx_asistente_msg_conv
    ON asistente_mensajes (tenant_id, conversacion_id, fecha_creacion ASC)
    STORING (rol, contenido, tokens_prompt, tokens_output, proveedor);










-- =============================================================================
-- 17. CANALES WHATSAPP (multi-tenant dinámico)
-- =============================================================================
-- Mapeo phone_number_id → tenant. Cuando Meta envía un mensaje al webhook,
-- el backend busca aquí qué tenant atiende ese número.
-- Cada tenant configura su canal desde el panel admin.
--
-- Flujo:
--   1. Meta envía POST /webhook/whatsapp con metadata.phone_number_id
--   2. SELECT tenant_id, access_token FROM canales_whatsapp WHERE phone_number_id = $1 AND activo = true
--   3. El service procesa el mensaje en el contexto de ese tenant
--   4. El controller envía la respuesta usando el access_token del canal
-- =============================================================================
CREATE TABLE IF NOT EXISTS canales_whatsapp (
    tenant_id           UUID        NOT NULL,
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    phone_number_id     STRING      NOT NULL,
    display_phone       STRING      NOT NULL DEFAULT '',
    access_token        STRING      NOT NULL DEFAULT '',
    verify_token        STRING      NOT NULL DEFAULT '',
    nombre_canal        STRING      NOT NULL DEFAULT 'WhatsApp Principal',
    chatbot_id          UUID,       -- FK al chatbot que define prompt/modelo/temperatura
    activo              BOOL        NOT NULL DEFAULT true,
    fecha_creacion      TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id),

    CONSTRAINT fk_canal_wa_chatbot
        FOREIGN KEY (tenant_id, chatbot_id)
        REFERENCES chatbots (tenant_id, id)
        ON DELETE SET NULL,

    UNIQUE INDEX idx_canal_wa_phone_activo (phone_number_id)
        STORING (access_token, verify_token, chatbot_id)
        WHERE activo = true
);

-- Canales activos de un tenant (panel admin)
CREATE INDEX IF NOT EXISTS idx_canal_wa_tenant ON canales_whatsapp (tenant_id)
    STORING (phone_number_id, display_phone, nombre_canal, chatbot_id, activo)
    WHERE activo = true;

-- Canales vinculados a un chatbot específico
CREATE INDEX IF NOT EXISTS idx_canal_wa_chatbot ON canales_whatsapp (tenant_id, chatbot_id)
    WHERE chatbot_id IS NOT NULL AND activo = true;











-- =============================================================================
-- 18. SOLICITUDES DE ASESOR (Atención en Vivo)
-- =============================================================================
-- Registra cuando un usuario solicita hablar con un asesor humano.
-- El bot de WhatsApp detecta la intención, recopila nombre/motivo,
-- crea el registro con marcador >>>SOLICITAR_ASESOR:...<<<
-- y el panel admin permite gestionarlas.
--
-- Flujo:
--   1. Usuario dice "quiero hablar con un asesor" en WhatsApp
--   2. Bot recopila nombre y motivo
--   3. Bot emite marcador → backend inserta en esta tabla
--   4. Panel admin muestra notificación con badge "Atención (N)"
--   5. Asesor toma la solicitud → estado cambia a EN_ATENCION
--   6. Asesor contacta al usuario por WhatsApp (botón "Abrir WhatsApp")
--   7. Asesor marca como RESUELTO cuando termina
-- =============================================================================
CREATE TABLE IF NOT EXISTS solicitudes_asesor (
    tenant_id           UUID        NOT NULL,
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),

    -- Datos del solicitante
    nombre              STRING      NOT NULL DEFAULT '',
    telefono            STRING      NOT NULL,
    motivo              STRING      NOT NULL DEFAULT '',

    -- Canal de origen
    canal_origen        STRING      NOT NULL DEFAULT 'WHATSAPP',
    -- Valores: WHATSAPP | WEB | TELEFONO
    canal_whatsapp_id   UUID,

    -- Gestión interna
    estado              STRING      NOT NULL DEFAULT 'PENDIENTE',
    -- Valores: PENDIENTE | EN_ATENCION | RESUELTO | CANCELADO
    prioridad           STRING      NOT NULL DEFAULT 'NORMAL',
    -- Valores: BAJA | NORMAL | ALTA | URGENTE

    asignado_a          UUID,
    fecha_asignacion    TIMESTAMPTZ,
    fecha_resolucion    TIMESTAMPTZ,
    nota_interna        STRING      NOT NULL DEFAULT '',

    -- Contexto de la conversación (resumen del bot antes de escalar)
    resumen_conversacion STRING     NOT NULL DEFAULT '',

    -- Auditoría
    fecha_creacion      TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id),

    CONSTRAINT fk_solicitud_canal_wa
        FOREIGN KEY (tenant_id, canal_whatsapp_id)
        REFERENCES canales_whatsapp (tenant_id, id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_solicitud_asesor
        FOREIGN KEY (tenant_id, asignado_a)
        REFERENCES usuarios_admin (tenant_id, id)
        ON DELETE RESTRICT
);

-- Solicitudes pendientes de un tenant (vista principal del panel)
CREATE INDEX IF NOT EXISTS idx_solicitud_asesor_pendientes
    ON solicitudes_asesor (tenant_id, estado, fecha_creacion DESC)
    STORING (nombre, telefono, motivo, canal_origen, prioridad, asignado_a)
    WHERE estado IN ('PENDIENTE', 'EN_ATENCION');

-- Solicitudes asignadas a un asesor específico
CREATE INDEX IF NOT EXISTS idx_solicitud_asesor_asignado
    ON solicitudes_asesor (tenant_id, asignado_a, estado)
    WHERE asignado_a IS NOT NULL;

-- Buscar por teléfono (evitar duplicados o ver historial)
CREATE INDEX IF NOT EXISTS idx_solicitud_asesor_telefono
    ON solicitudes_asesor (tenant_id, telefono, fecha_creacion DESC);
















-- =============================================================================
-- 19. MENSAJES DE ATENCIÓN EN VIVO (Chat Asesor ↔ Cliente)
-- =============================================================================
-- Mensajes entre asesores y clientes durante una solicitud EN_ATENCION.
-- El asesor escribe desde el panel → sale por el bot de WhatsApp.
-- El cliente responde por WhatsApp → se guarda aquí en vez de ir a la IA.
--
-- Remitentes:
--   CLIENTE → mensaje entrante del usuario por WhatsApp
--   ASESOR  → mensaje saliente del asesor desde el panel
--   SISTEMA → mensajes automáticos (handoff, transferencia, cierre)
-- =============================================================================
CREATE TABLE IF NOT EXISTS mensajes_atencion (
    tenant_id       UUID        NOT NULL,
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    solicitud_id    UUID        NOT NULL,

    remitente       STRING      NOT NULL,
    -- Valores: CLIENTE | ASESOR | SISTEMA

    contenido       STRING      NOT NULL,
    asesor_id       UUID,

    fecha_envio     TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, id),

    CONSTRAINT fk_msg_atencion_solicitud
        FOREIGN KEY (tenant_id, solicitud_id)
        REFERENCES solicitudes_asesor (tenant_id, id)
        ON DELETE CASCADE,

    CONSTRAINT fk_msg_atencion_asesor
        FOREIGN KEY (tenant_id, asesor_id)
        REFERENCES usuarios_admin (tenant_id, id)
        ON DELETE CASCADE
);

-- Mensajes de una solicitud ordenados (query principal del chat)
CREATE INDEX IF NOT EXISTS idx_msg_atencion_solicitud
    ON mensajes_atencion (tenant_id, solicitud_id, fecha_envio ASC)
    STORING (remitente, contenido, asesor_id);

-- Mensajes recientes por tenant (monitoreo)
CREATE INDEX IF NOT EXISTS idx_msg_atencion_recientes
    ON mensajes_atencion (tenant_id, fecha_envio DESC)
    STORING (solicitud_id, remitente);
















-- =============================================================================
-- COMENTARIOS
-- =============================================================================
COMMENT ON TABLE asistente_conversaciones IS 'Conversaciones del asistente IA interno. TTL de 7 días. Máximo 10 por usuario.';
COMMENT ON TABLE asistente_mensajes IS 'Mensajes de conversaciones del asistente. CASCADE delete con la conversación padre.';
COMMENT ON COLUMN asistente_conversaciones.fecha_expiracion IS 'TTL de 7 días. CockroachDB elimina automáticamente las conversaciones viejas.';
COMMENT ON COLUMN asistente_conversaciones.total_mensajes IS 'Contador actualizado por el backend. Máximo 50 mensajes por conversación.';
COMMENT ON TABLE canales_whatsapp IS 'Mapeo phone_number_id → tenant para WhatsApp multi-tenant. chatbot_id vincula al chatbot que define prompt/modelo/temperatura. Si es NULL, usa config por defecto.';
COMMENT ON COLUMN canales_whatsapp.access_token IS 'Token de Meta. En desarrollo va en plano, en producción encriptar con AES-256.';
COMMENT ON TABLE solicitudes_asesor IS 'Solicitudes de atención humana desde WhatsApp u otro canal. El bot crea el registro; el panel admin permite gestionarlas.';
COMMENT ON TABLE mensajes_atencion IS 'Chat en vivo entre asesor y cliente durante atención humana. Los mensajes del asesor salen por el bot de WhatsApp.';

# Nexus — versión corregida con Sistema de Voz y Compliance

Centro personal de proyectos, aplicaciones y agentes con sistema de voz integrado y compliance regulatorio. Esta versión conserva Next.js 14 y React 18 para evitar una migración mayor, y actualiza Next a 14.2.35. La rama 14 está fuera de soporte: antes de publicar en Internet se requiere migración a una versión mantenida y otra revisión de dependencias.

## Novedades

### Sistema de Voz
- **Speech-to-Text**: Dicta comandos y tareas por voz
- **Text-to-Speech**: El sistema responde por voz
- **Integración con agentes**: Usa el sistema de agentes por comandos de voz
- **Comandos rápidos**: Botones pre-configurados para tareas comunes

### KAIBARIX Compliance
- **Plugin de compliance**: Integración con el sistema de compliance de KAIBARIX
- **20 industrias soportadas**: Healthcare, Financial Services, Tax Preparation, etc.
- **30+ regulaciones**: FDA 21 CFR Part 11, HIPAA, GDPR, IRS Circular 230, etc.
- **Agente de compliance por voz**: Pre-configurado para comandos de compliance

## Preparar en Windows

1. Instala Node.js LTS (20 o posterior, recomendado 22): https://nodejs.org/en/download
2. Instala Docker Desktop, ábrelo y espera a que el motor esté listo: https://docs.docker.com/desktop/setup/install/windows-install/
3. Abre PowerShell en esta carpeta y ejecuta:

```powershell
.\scripts\Preparar-Nexus.ps1 -Arrancar
```

El script comprueba Docker, instala pnpm 9.15.9 localmente, descarga las dependencias fijadas en pnpm-lock.yaml, genera .env con secretos aleatorios, genera Prisma, arranca PostgreSQL/Redis/MinIO y prepara una base nueva. No requiere instalar pnpm globalmente.

Abre http://localhost:3000. Consulta SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en .env. La contraseña no se imprime ni se fija en el código. El script conserva cualquier .env existente y el seed no cambia la contraseña de cuentas existentes.

**Base existente:** haz una copia de seguridad y revisa el cambio de schema antes de ejecutar db:push. No uses --accept-data-loss. La corrección añade AgentRun.scheduledKey para deduplicar los horarios. No ejecutes esta preparación contra una base real que no hayas respaldado.

## Preparación manual

```powershell
npm install -g pnpm@9.15.9
pnpm install --frozen-lockfile
pnpm setup
pnpm db:generate
docker compose -f docker-compose.dev.yml up -d --wait
pnpm db:push
pnpm db:seed
pnpm dev
```

El arranque usa pnpm workspaces sin ejecutables nativos de Turbo. Los comandos de desarrollo cargan las variables de .env en la web y el worker. Para ejecutar agentes se necesita OPENAI_API_KEY o conectar OpenAI desde Herramientas. Sin clave se pueden usar proyectos y aplicaciones; las llamadas de agentes fallarán con un mensaje explícito. No se incluye una integración Claude que no estaba registrada ni conectada al motor.

## Docker completo

```powershell
pnpm setup
docker compose build
docker compose up -d postgres redis minio --wait
docker compose run --rm web pnpm --filter @nexus/db db:push
docker compose run --rm web pnpm --filter @nexus/db db:seed
docker compose up -d web worker
```

Las imágenes se construyen desde la raíz del monorepo e incluyen las herramientas para generar Prisma y preparar la base. PostgreSQL y Redis no se publican fuera de Docker en este modo. Web y MinIO se enlazan solo a 127.0.0.1. Para acceso remoto se requiere configurar dominio, TLS y autenticación de los servicios expuestos.

## Comprobaciones

```powershell
pnpm test
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm build
```

## Comportamiento y límites

- Los horarios usan SCHEDULE_TIMEZONE, UTC por defecto. Un reinicio no recupera ejecuciones omitidas. La deduplicación por minuto es persistente y permite agentes cada minuto.
- Cancelar impide que una ejecución pendiente arranque, que se inicien más pasos y que el worker sobrescriba CANCELLED. Una llamada externa que ya está en curso puede terminar y no puede deshacerse; no se promete abortarla instantáneamente.
- Agotar iteraciones o recibir una respuesta truncada falla explícitamente; no se informa como éxito.
- Las integraciones son globales en el esquema original. Solo ADMIN puede administrar o ejecutar agentes e integraciones; las cuentas USER conservan proyectos, tareas y aplicaciones propios. Es una instalación personal/de confianza, no un sistema multiempresa.
- ENCRYPTION_KEY debe tener al menos 32 caracteres y mantenerse estable. Si vienes de la clave predeterminada insegura, vuelve a conectar las integraciones; no cambies la clave de una instalación existente sin planificar la migración.
- Las acciones externas se ejecutan con los permisos de las credenciales conectadas. Usa cuentas con permisos mínimos, particularmente en Snowflake. No hay aprobación humana por acción ni límite monetario de uso; el bucle tiene un máximo de 15 iteraciones y timeout del proveedor.
- Los resultados completos de herramientas no se persisten en logs. La entrada y el resultado final sí permanecen en la base de datos.
- Snowflake indica explícitamente si la primera partición devuelve resultados parciales; no se presenta como una descarga completa.
- MinIO se prepara como infraestructura; este código no incluye un explorador de archivos.

## Fuentes de las correcciones de compatibilidad

- Next.js: https://nextjs.org/blog/security-update-2025-12-11
- Soporte de versiones: https://nextjs.org/support-policy
- Croner: https://github.com/Hexagon/croner
- Snowflake PAT: https://docs.snowflake.com/en/developer-guide/snowflake-rest-api/authentication

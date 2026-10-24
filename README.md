# Agente de Ventas IA

Agente de IA para **generar ventas con marketing orgánico**: publicaciones para redes, guiones de Reels/TikTok, calendarios de contenido, mensajes de WhatsApp, respuestas a objeciones e ideas SEO. Usa **Claude Fable 5.1** con búsqueda web para revisar tendencias actuales.

Hecho con Next.js y el SDK oficial de Anthropic, listo para publicar en Vercel.

## Funciones

- **Perfil del negocio** (nombre, producto, público, tono, canales): el agente lo usa en cada respuesta. Se guarda solo en tu navegador.
- **Acciones rápidas**: calendario semanal, post de Instagram, guion de video, secuencia de WhatsApp, objeciones, tendencias y SEO.
- **Búsqueda web**: el agente busca tendencias y datos actuales cuando hace falta.
- **Respuestas en tiempo real** (streaming) y botón para **copiar**.
- **Contraseña opcional** (`APP_PASSWORD`) para que nadie más use tu clave.

## Publicar en Vercel

1. Entra a [vercel.com/new](https://vercel.com/new) e importa este repositorio de GitHub.
2. En **Environment Variables** agrega:
   - `ANTHROPIC_API_KEY`: tu clave de [console.anthropic.com](https://console.anthropic.com)
   - `APP_PASSWORD`: una contraseña (recomendado)
3. Pulsa **Deploy**. Luego abre la app, llena el perfil del negocio y pon la contraseña en el campo correspondiente.

## Ejecutar en tu computadora

```bash
npm install
cp .env.example .env.local   # y pon tu ANTHROPIC_API_KEY
npm run dev
```

Abre http://localhost:3000.

## Configuración

| Variable | Obligatoria | Descripción |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sí | Clave de la API de Anthropic |
| `APP_PASSWORD` | No | Si se define, la app la pide antes de responder |
| `ANTHROPIC_MODEL` | No | Modelo a usar (por defecto `claude-fable-5-1`; también `claude-opus-5-5`, más económico, o `claude-mythos-5-1` si tu organización tiene acceso a Project Glasswing) |

## Archivos principales

- `lib/prompt.ts`: instrucciones del agente (personalízalas a tu gusto).
- `app/api/chat/route.ts`: llamada a Claude con búsqueda web, streaming y respaldo automático si el modelo rechaza una solicitud.
- `app/page.tsx`: interfaz del chat.

## Costos

Claude Fable 5.1 cuesta $10 por millón de tokens de entrada y $50 por millón de salida, más el costo de cada búsqueda web. Una respuesta típica cuesta unos centavos. Para gastar menos, define `ANTHROPIC_MODEL=claude-opus-5-5` ($4 / $20).

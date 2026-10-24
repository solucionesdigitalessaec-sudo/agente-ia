import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, perfilComoTexto, type PerfilNegocio } from "@/lib/prompt";

// Las respuestas de Claude Fable 5.1 con búsqueda web pueden tardar minutos.
export const maxDuration = 300;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-fable-5-1";
const MAX_PAUSAS = 3;

const client = new Anthropic();

type ChatBody = {
  messages: { role: "user" | "assistant"; content: string }[];
  perfil?: PerfilNegocio;
};

export async function POST(req: Request) {
  const password = process.env.APP_PASSWORD;
  if (password && req.headers.get("x-app-password") !== password) {
    return new Response("Contraseña incorrecta.", { status: 401 });
  }

  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Solicitud inválida.", { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response("Faltan mensajes.", { status: 400 });
  }

  const system: Anthropic.Beta.BetaTextBlockParam[] = [{ type: "text", text: SYSTEM_PROMPT }];
  const perfil = perfilComoTexto(body.perfil);
  if (perfil) system.push({ type: "text", text: perfil });

  const messages: Anthropic.Beta.BetaMessageParam[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (text: string) => controller.enqueue(encoder.encode(text));
      try {
        for (let pausa = 0; pausa <= MAX_PAUSAS; pausa++) {
          const response = client.beta.messages.stream({
            model: MODEL,
            max_tokens: 64000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            cache_control: { type: "ephemeral" },
            output_config: { effort: "medium" },
            system,
            tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
            messages,
          });

          for await (const event of response) {
            if (event.type === "content_block_start" && event.content_block.type === "server_tool_use") {
              write("\n\n_🔎 Buscando en la web…_\n\n");
            } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              write(event.delta.text);
            }
          }

          const final = await response.finalMessage();
          if (final.stop_reason === "pause_turn") {
            // La búsqueda web hizo una pausa: se reenvía el turno y el servidor continúa.
            messages.push({ role: "assistant", content: final.content });
            continue;
          }
          if (final.stop_reason === "refusal") {
            write("\n\n> ⚠️ El modelo no pudo completar esta solicitud. Intenta reformularla.");
          } else if (final.stop_reason === "max_tokens") {
            write("\n\n> ⚠️ La respuesta se cortó por longitud. Pide que continúe.");
          }
          break;
        }
      } catch (error) {
        if (error instanceof Anthropic.AuthenticationError) {
          write("\n\n> ❌ La clave ANTHROPIC_API_KEY no es válida.");
        } else if (error instanceof Anthropic.RateLimitError) {
          write("\n\n> ❌ Límite de uso alcanzado. Espera un momento e intenta de nuevo.");
        } else if (error instanceof Anthropic.APIError) {
          write(`\n\n> ❌ Error de la API (${error.status}): ${error.message}`);
        } else {
          console.error(error);
          write("\n\n> ❌ Error inesperado en el servidor.");
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

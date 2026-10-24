"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PerfilNegocio } from "@/lib/prompt";

type Mensaje = { role: "user" | "assistant"; content: string };

const ACCIONES = [
  { titulo: "📅 Calendario semanal", prompt: "Hazme un calendario de contenido orgánico para los próximos 7 días, con una publicación diaria por canal, gancho, texto y llamada a la acción." },
  { titulo: "📸 Post de Instagram", prompt: "Escribe 3 opciones de publicación para Instagram que generen ventas de mi producto principal, con gancho, texto, llamada a la acción y hashtags." },
  { titulo: "🎬 Guion de Reel / TikTok", prompt: "Escribe 2 guiones de video corto (30-45 s) para Reels/TikTok, con gancho de 3 segundos, escenas y texto en pantalla." },
  { titulo: "💬 Mensajes de WhatsApp", prompt: "Escribe una secuencia de 4 mensajes de WhatsApp para convertir a un cliente interesado en comprador, sin ser invasivo." },
  { titulo: "🛡️ Responder objeciones", prompt: "Dame respuestas para las 5 objeciones más comunes de mis clientes (precio, confianza, 'lo pienso', etc.)." },
  { titulo: "🔥 Tendencias actuales", prompt: "Busca en la web las tendencias actuales de mi sector y dime 5 ideas de contenido para aprovecharlas esta semana." },
  { titulo: "🔍 Ideas SEO / blog", prompt: "Propón 5 artículos de blog con palabras clave que mis clientes buscan, con título, estructura y meta descripción." },
];

const CAMPOS: { clave: keyof PerfilNegocio; etiqueta: string; ejemplo: string }[] = [
  { clave: "nombre", etiqueta: "Negocio", ejemplo: "Panadería La Espiga" },
  { clave: "producto", etiqueta: "Qué vendes", ejemplo: "Pan artesanal y pasteles por encargo" },
  { clave: "publico", etiqueta: "Público objetivo", ejemplo: "Familias de Quito, 25-45 años" },
  { clave: "tono", etiqueta: "Tono de marca", ejemplo: "Cálido, cercano, con humor" },
  { clave: "canales", etiqueta: "Canales", ejemplo: "Instagram, WhatsApp, TikTok" },
  { clave: "enlace", etiqueta: "Enlace / contacto", ejemplo: "wa.me/593..." },
];

function leer<T>(clave: string, defecto: T): T {
  try {
    const v = localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : defecto;
  } catch {
    return defecto;
  }
}

function guardar(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {}
}

export default function Home() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [entrada, setEntrada] = useState("");
  const [cargando, setCargando] = useState(false);
  const [perfil, setPerfil] = useState<PerfilNegocio>({});
  const [password, setPassword] = useState("");
  const [verPerfil, setVerPerfil] = useState(true);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPerfil(leer("perfil", {}));
    setPassword(leer("password", ""));
    setVerPerfil(!leer<PerfilNegocio>("perfil", {}).producto);
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  function actualizarPerfil(clave: keyof PerfilNegocio, valor: string) {
    const nuevo = { ...perfil, [clave]: valor };
    setPerfil(nuevo);
    guardar("perfil", nuevo);
  }

  async function enviar(texto: string) {
    const contenido = texto.trim();
    if (!contenido || cargando) return;
    const historial: Mensaje[] = [...mensajes, { role: "user", content: contenido }];
    setMensajes([...historial, { role: "assistant", content: "" }]);
    setEntrada("");
    setCargando(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-app-password": password },
        body: JSON.stringify({ messages: historial, perfil }),
      });
      if (!res.ok || !res.body) {
        const error = await res.text();
        setMensajes([...historial, { role: "assistant", content: `> ❌ ${error || res.statusText}` }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let respuesta = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        respuesta += decoder.decode(value, { stream: true });
        setMensajes([...historial, { role: "assistant", content: respuesta }]);
      }
    } catch {
      setMensajes([...historial, { role: "assistant", content: "> ❌ No se pudo conectar con el servidor." }]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="app">
      <header className="cabecera">
        <div>
          <h1>Agente de Ventas IA</h1>
          <p>Contenido orgánico y textos de venta con Claude Fable 5.1</p>
        </div>
        <div className="botones-cabecera">
          <button className="secundario" onClick={() => setVerPerfil(!verPerfil)}>
            {verPerfil ? "Ocultar perfil" : "Perfil del negocio"}
          </button>
          {mensajes.length > 0 && (
            <button className="secundario" onClick={() => setMensajes([])} disabled={cargando}>
              Nueva conversación
            </button>
          )}
        </div>
      </header>

      {verPerfil && (
        <section className="perfil">
          <p className="ayuda">El agente usa estos datos en cada respuesta. Se guardan solo en este navegador.</p>
          <div className="campos">
            {CAMPOS.map((c) => (
              <label key={c.clave}>
                <span>{c.etiqueta}</span>
                <input
                  value={perfil[c.clave] ?? ""}
                  placeholder={c.ejemplo}
                  onChange={(e) => actualizarPerfil(c.clave, e.target.value)}
                />
              </label>
            ))}
            <label>
              <span>Contraseña de la app (si configuraste APP_PASSWORD)</span>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  guardar("password", e.target.value);
                }}
              />
            </label>
          </div>
        </section>
      )}

      <section className="chat">
        {mensajes.length === 0 ? (
          <div className="inicio">
            <h2>¿Qué vendemos hoy?</h2>
            <div className="acciones">
              {ACCIONES.map((a) => (
                <button key={a.titulo} onClick={() => enviar(a.prompt)}>
                  {a.titulo}
                </button>
              ))}
            </div>
          </div>
        ) : (
          mensajes.map((m, i) => (
            <div key={i} className={`mensaje ${m.role}`}>
              {m.role === "assistant" ? (
                <>
                  {m.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  ) : (
                    <p className="pensando">Pensando… (puede tardar un poco)</p>
                  )}
                  {m.content && !(cargando && i === mensajes.length - 1) && (
                    <button className="copiar" onClick={() => navigator.clipboard.writeText(m.content)}>
                      Copiar
                    </button>
                  )}
                </>
              ) : (
                <p>{m.content}</p>
              )}
            </div>
          ))
        )}
        <div ref={finRef} />
      </section>

      <form
        className="entrada"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(entrada);
        }}
      >
        <textarea
          value={entrada}
          placeholder="Pide un post, un guion, una campaña…"
          rows={2}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(entrada);
            }
          }}
        />
        <button type="submit" disabled={cargando || !entrada.trim()}>
          {cargando ? "…" : "Enviar"}
        </button>
      </form>
    </main>
  );
}

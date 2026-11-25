import "dotenv/config";
import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { FunctionDeclaration, GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(express.json({ limit: "15mb" }));

const PORT = Number(process.env.PORT) || 3000;

const MAX_ATTACHMENT_BASE64_CHARS = 14_000_000; // ~10.5 MB binary

const IMAGE_MIME_MAP: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
  "image/heic": "image/heic",
  "image/heif": "image/heif",
};

const AUDIO_MIME_MAP: Record<string, string> = {
  "audio/webm": "audio/webm",
  "audio/mp3": "audio/mp3",
  "audio/mpeg": "audio/mp3",
  "audio/wav": "audio/wav",
  "audio/x-wav": "audio/wav",
  "audio/ogg": "audio/ogg",
  "audio/mp4": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/aac": "audio/aac",
  "audio/flac": "audio/flac",
};

const VALID_EXPENSE_CATEGORIES = [
  "Alimentación",
  "Transporte",
  "Servicios públicos",
  "Ropa y compras personales",
  "Entretenimiento y ocio",
] as const;

type ValidCategory = (typeof VALID_EXPENSE_CATEGORIES)[number];

// Active models ordered by priority for automatic cascade fallback
const FALLBACK_MODELS = [
  "gemini-4-hydrogen",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
];

const registerExpenseDeclaration: FunctionDeclaration = {
  name: "registerExpense",
  description:
    "Registra un nuevo gasto en pesos colombianos (COP) dentro del presupuesto mensual del usuario.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: {
        type: Type.NUMBER,
        description:
          "Monto exacto del gasto en pesos colombianos (COP), número positivo sin puntos ni comas.",
      },
      date: {
        type: Type.STRING,
        description:
          "Fecha del gasto en formato estricto YYYY-MM-DD. Si el usuario dice 'hoy', usa la fecha actual del contexto.",
      },
      description: {
        type: Type.STRING,
        description:
          "Descripción corta y clara del gasto (ejemplo: 'Almuerzo', 'Comida', 'Pasaje bus').",
      },
      category: {
        type: Type.STRING,
        description:
          "Categoría del gasto. Debe ser exactamente una de: 'Alimentación', 'Transporte', 'Servicios públicos', 'Ropa y compras personales', 'Entretenimiento y ocio'.",
      },
    },
    required: ["amount", "date", "description", "category"],
  },
};

function normalizeCategory(raw: unknown): ValidCategory {
  if (typeof raw !== "string") return "Alimentación";
  const lower = raw.toLowerCase().trim();
  const exact = VALID_EXPENSE_CATEGORIES.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;

  if (
    lower.includes("comida") ||
    lower.includes("aliment") ||
    lower.includes("almuerzo") ||
    lower.includes("cena") ||
    lower.includes("mercado") ||
    lower.includes("café")
  ) {
    return "Alimentación";
  }
  if (
    lower.includes("transp") ||
    lower.includes("bus") ||
    lower.includes("taxi") ||
    lower.includes("uber") ||
    lower.includes("pasaje") ||
    lower.includes("metro")
  ) {
    return "Transporte";
  }
  if (
    lower.includes("servic") ||
    lower.includes("luz") ||
    lower.includes("agua") ||
    lower.includes("gas") ||
    lower.includes("internet") ||
    lower.includes("energía")
  ) {
    return "Servicios públicos";
  }
  if (
    lower.includes("ropa") ||
    lower.includes("compra") ||
    lower.includes("zapato") ||
    lower.includes("camisa") ||
    lower.includes("aseo")
  ) {
    return "Ropa y compras personales";
  }
  if (
    lower.includes("entreten") ||
    lower.includes("ocio") ||
    lower.includes("cine") ||
    lower.includes("salida") ||
    lower.includes("libro")
  ) {
    return "Entretenimiento y ocio";
  }
  return "Alimentación";
}

function extractHttpStatus(err: unknown): number {
  if (!err || typeof err !== "object") return 500;
  const anyErr = err as Record<string, unknown>;
  const directStatus = Number(anyErr.status ?? anyErr.statusCode ?? anyErr.code);
  if (!Number.isNaN(directStatus) && directStatus >= 400 && directStatus < 600) {
    return directStatus;
  }
  const msg = String(anyErr.message ?? err);
  if (/\b429\b|RESOURCE_EXHAUSTED/i.test(msg)) return 429;
  if (/\b503\b|UNAVAILABLE|OVERLOADED/i.test(msg)) return 503;
  if (/\b404\b|NOT_FOUND/i.test(msg)) return 404;
  if (/\b403\b|PERMISSION_DENIED/i.test(msg)) return 403;
  if (/\b401\b|UNAUTHENTICATED/i.test(msg)) return 401;
  if (/\b400\b|INVALID_ARGUMENT/i.test(msg)) return 400;
  return 500;
}

function isCascadeRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 404;
}

interface AttachmentInput {
  kind: "image" | "audio";
  mimeType: string;
  data: string;
  name?: string;
}

interface ChatMessageInput {
  role: "user" | "assistant";
  text?: string;
  attachment?: AttachmentInput;
}

interface BudgetContextInput {
  monthlyBudget: number;
  totalSpent: number;
  availableBalance: number;
  totalIncome: number;
  todayISO: string;
  userName?: string;
}

function normalizeAndValidateAttachment(
  raw: AttachmentInput
): { ok: true; mimeType: string; data: string; kind: "image" | "audio" } | { ok: false; error: string } {
  if (!raw || (raw.kind !== "image" && raw.kind !== "audio")) {
    return { ok: false, error: "Tipo de archivo adjunto no válido." };
  }

  const baseMime = String(raw.mimeType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  const normalizedMime =
    raw.kind === "image" ? IMAGE_MIME_MAP[baseMime] : AUDIO_MIME_MAP[baseMime];

  if (!normalizedMime) {
    return {
      ok: false,
      error:
        raw.kind === "image"
          ? "Formato de imagen no compatible. Usa PNG, JPG, WEBP o HEIC."
          : "Formato de audio no compatible. Usa WEBM, MP3, WAV, OGG o M4A.",
    };
  }

  if (typeof raw.data !== "string" || raw.data.trim().length === 0) {
    return { ok: false, error: "El archivo adjunto está vacío." };
  }

  const strippedData = raw.data.replace(/^data:[^;]+;base64,/i, "").trim();
  if (strippedData.length > MAX_ATTACHMENT_BASE64_CHARS) {
    return {
      ok: false,
      error: "El archivo supera el tamaño máximo permitido (10 MB).",
    };
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(strippedData)) {
    return { ok: false, error: "El contenido codificado del archivo no es válido." };
  }

  return {
    ok: true,
    mimeType: normalizedMime,
    data: strippedData,
    kind: raw.kind,
  };
}

app.post("/api/assistant/chat", async (req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      code: 500,
      error: "Falta configurar GEMINI_API_KEY en el servidor.",
    });
  }

  const body = req.body as {
    messages?: ChatMessageInput[];
    budgetContext?: BudgetContextInput;
  };

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (messages.length === 0) {
    return res.status(400).json({
      code: 400,
      error: "Debes enviar al menos un mensaje para el asistente.",
    });
  }

  const ctx = body.budgetContext ?? {
    monthlyBudget: 3_200_000,
    totalSpent: 0,
    availableBalance: 3_200_000,
    totalIncome: 0,
    todayISO: "2026-11-24",
    userName: "Usuario",
  };

  const safeUserName =
    typeof ctx.userName === "string" && ctx.userName.trim().length > 0
      ? ctx.userName.trim().slice(0, 60)
      : "Usuario";

  const safeTodayISO =
    typeof ctx.todayISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ctx.todayISO)
      ? ctx.todayISO
      : "2026-11-24";

  const recentMessages = messages.slice(-12);

  type PartItem =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } };

  const contents: Array<{ role: "user" | "model"; parts: PartItem[] }> = [];

  for (let idx = 0; idx < recentMessages.length; idx++) {
    const m = recentMessages[idx];
    const trimmedText = typeof m.text === "string" ? m.text.trim() : "";
    const parts: PartItem[] = [];
    const isNearEnd = idx >= recentMessages.length - 3;

    if (m.role === "user" && m.attachment && isNearEnd) {
      const validated = normalizeAndValidateAttachment(m.attachment);
      if (!validated.ok) {
        return res.status(400).json({
          code: 400,
          error: validated.error,
        });
      }
      parts.push({
        inlineData: {
          mimeType: validated.mimeType,
          data: validated.data,
        },
      });
      parts.push({
        text:
          trimmedText ||
          (validated.kind === "image"
            ? "Analiza esta imagen (ticket, recibo, captura o apunte) para identificar monto, fecha y descripción del gasto."
            : "Transcribe esta nota de voz y extrae el monto, la fecha y la descripción del gasto."),
      });
    } else if (trimmedText.length > 0) {
      parts.push({ text: trimmedText });
    } else if (m.role === "user" && m.attachment) {
      parts.push({
        text:
          m.attachment.kind === "image"
            ? "[Imagen adjunta anteriormente]"
            : "[Nota de voz adjunta anteriormente]",
      });
    }

    if (parts.length > 0) {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts,
      });
    }
  }

  if (contents.length === 0) {
    return res.status(400).json({
      code: 400,
      error: "Debes enviar texto, una imagen o una nota de voz válida.",
    });
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const formattedBudget = Math.round(ctx.monthlyBudget).toLocaleString("es-CO");
  const formattedSpent = Math.round(ctx.totalSpent).toLocaleString("es-CO");
  const formattedBalance = Math.round(ctx.availableBalance).toLocaleString("es-CO");
  const formattedIncome = Math.round(ctx.totalIncome).toLocaleString("es-CO");

  // Preserve original assistant instructions verbatim and extend with image, audio, validation & dynamic context rules
  const systemInstruction = [
    "Eres un asistente experto en finanzas personales integrado en 'Mi Presupuesto Mensual' (Colombia, moneda COP).",
    "Sé breve, amable, claro y práctico. Responde siempre en español.",
    `Contexto financiero actual del usuario: Nombre del usuario = ${safeUserName}, Fecha de hoy = ${safeTodayISO}, Presupuesto disponible total = $${formattedBudget} COP, Total gastado = $${formattedSpent} COP, Saldo disponible = $${formattedBalance} COP, Ingresos extra = $${formattedIncome} COP.`,
    "Cuando el usuario indique que realizó un gasto (por ejemplo 'Gasté 500 en comida hoy' o 'Pagué 45000 de taxi'), llama de inmediato a la función registerExpense extrayendo amount, date (YYYY-MM-DD), description y category (usando únicamente una de: Alimentación, Transporte, Servicios públicos, Ropa y compras personales, Entretenimiento y ocio).",
    "Siempre confirma brevemente los datos del gasto (monto, descripción, categoría y fecha) antes o después de ejecutar registerExpense.",
    "Si el usuario pregunta por su saldo o presupuesto, responde usando exactamente las cifras del contexto proporcionado.",
    "Imagen: Al recibir un ticket, recibo, captura de compra o apunte de gasto, extrae monto, fecha y descripción (y deduce la categoría). Si la imagen es borrosa, un dato no se ve, está dudoso o falta información, pregunta al usuario antes de guardar y NO llames a registerExpense; NO inventes datos.",
    "Audio: Al recibir una nota de voz o audio, transcríbela en tu respuesta y extrae monto, fecha y descripción (y deduce la categoría). Si falta algún dato o no se entiende con claridad, solicita aclaración al usuario antes de guardar y NO llames a registerExpense; NO inventes información.",
    "Validación: Si la imagen, el audio o el archivo no tienen que ver con gastos o finanzas de Mi Presupuesto, indica claramente que no puedes procesarlo ni registrarlo.",
    `Reglas de Registro: Usa siempre la herramienta registerExpense para guardar datos confirmados. Al finalizar un registro, dirígete al usuario por su nombre (ej: '¡Listo, ${safeUserName}! He guardado tu gasto'). Para consultas de compras, compara el gasto solicitado con el saldo disponible actual en el contexto ($${formattedBalance} COP).`,
    `Contexto Dinámico: Siempre utiliza la fecha actual (${safeTodayISO}), el nombre del usuario (${safeUserName}) y el saldo disponible ($${formattedBalance} COP) proporcionados en cada mensaje.`,
  ].join(" ");

  let lastErrorStatus = 500;
  let lastErrorMessage = "Error desconocido al consultar la API de Gemini.";

  for (const model of FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [registerExpenseDeclaration] }],
        },
      });

      // Robust manual extraction from response.candidates[0].content.parts
      const candidateContent = response.candidates?.[0]?.content;
      const parts = candidateContent?.parts ?? [];

      const textChunks: string[] = [];
      const extractedCalls: Array<{
        id?: string;
        name: string;
        args: {
          amount: number;
          date: string;
          description: string;
          category: ValidCategory;
        };
      }> = [];

      for (const part of parts) {
        if (typeof part.text === "string" && part.text.trim().length > 0) {
          textChunks.push(part.text.trim());
        }
        if (part.functionCall && part.functionCall.name === "registerExpense") {
          const rawArgs = (part.functionCall.args ?? {}) as Record<string, unknown>;
          const parsedAmount = Number(rawArgs.amount);
          const validAmount =
            Number.isFinite(parsedAmount) && parsedAmount > 0
              ? Math.round(parsedAmount)
              : 0;
          const rawDate =
            typeof rawArgs.date === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(rawArgs.date)
              ? rawArgs.date
              : safeTodayISO;
          const rawDescription =
            typeof rawArgs.description === "string" &&
            rawArgs.description.trim().length > 0
              ? rawArgs.description.trim()
              : "Gasto registrado";
          const normalizedCategory = normalizeCategory(rawArgs.category);

          if (validAmount > 0) {
            extractedCalls.push({
              id: part.functionCall.id,
              name: "registerExpense",
              args: {
                amount: validAmount,
                date: rawDate,
                description: rawDescription,
                category: normalizedCategory,
              },
            });
          }
        }
      }

      let finalReply = textChunks.join("\n").trim();

      // If Gemini emitted a functionCall without conversational text, send functionResponse to confirm naturally with user name
      if (extractedCalls.length > 0 && !finalReply && candidateContent) {
        const firstCall = extractedCalls[0];
        try {
          const followUp = await ai.models.generateContent({
            model,
            contents: [
              ...contents,
              candidateContent,
              {
                role: "user",
                parts: [
                  {
                    functionResponse: {
                      id: firstCall.id,
                      name: firstCall.name,
                      response: {
                        ok: true,
                        userName: safeUserName,
                        registered: firstCall.args,
                        newAvailableBalance:
                          ctx.availableBalance - firstCall.args.amount,
                      },
                    },
                  },
                ],
              },
            ],
            config: {
              systemInstruction,
              tools: [{ functionDeclarations: [registerExpenseDeclaration] }],
            },
          });

          const followUpParts = followUp.candidates?.[0]?.content?.parts ?? [];
          const followUpText = followUpParts
            .map((p) => (typeof p.text === "string" ? p.text.trim() : ""))
            .filter(Boolean)
            .join("\n")
            .trim();
          if (followUpText) {
            finalReply = followUpText;
          }
        } catch {
          // Keep resilient confirmation fallback below if follow-up call fails
        }
      }

      if (!finalReply && extractedCalls.length > 0) {
        const call = extractedCalls[0].args;
        finalReply = `¡Listo, ${safeUserName}! He guardado tu gasto de $${call.amount.toLocaleString(
          "es-CO"
        )} COP en ${call.category} (${call.description}) con fecha ${call.date}.`;
      }

      if (!finalReply) {
        finalReply =
          "No pude generar una respuesta clara. ¿Puedes reformular tu solicitud?";
      }

      return res.json({
        modelUsed: model,
        reply: finalReply,
        functionCalls: extractedCalls,
      });
    } catch (err) {
      const status = extractHttpStatus(err);
      const message =
        err instanceof Error
          ? err.message
          : "Error inesperado en la API de Gemini";
      lastErrorStatus = status;
      lastErrorMessage = message;

      if (isCascadeRetryableStatus(status)) {
        continue;
      }

      return res.status(status).json({
        code: status,
        error: message,
      });
    }
  }

  return res.status(lastErrorStatus).json({
    code: lastErrorStatus,
    error: lastErrorMessage,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve("dist");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get("/{*path}", (_req, res) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

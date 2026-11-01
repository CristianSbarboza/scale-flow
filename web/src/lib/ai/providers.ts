import "server-only";

import type { AiProviderId } from "@/types/domain";

export interface AiToolPropertySchema {
  type: "string" | "number" | "boolean" | "array";
  description: string;
  enum?: string[];
  items?: {
    type: "string" | "number" | "object";
    properties?: Record<string, AiToolPropertySchema>;
    required?: string[];
  };
}

export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, AiToolPropertySchema>;
    required?: string[];
  };
}

export interface AiToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface AiTurnMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiModelResponse {
  text: string;
  toolCalls: AiToolCall[];
}

export const AI_PROVIDER_INFO: Record<
  AiProviderId,
  { label: string; defaultModel: string; placeholderKey: string; hint: string }
> = {
  gemini: {
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    placeholderKey: "AIzaSy...",
    hint: "Obtenha no Google AI Studio (aistudio.google.com).",
  },
  claude: {
    label: "Anthropic Claude",
    defaultModel: "claude-3-5-sonnet-latest",
    placeholderKey: "sk-ant-...",
    hint: "Obtenha no console da Anthropic (console.anthropic.com).",
  },
  openai: {
    label: "OpenAI (ChatGPT)",
    defaultModel: "gpt-4o-mini",
    placeholderKey: "sk-proj-...",
    hint: "Obtenha na plataforma OpenAI (platform.openai.com).",
  },
  groq: {
    label: "Groq Cloud (Ultra-rápido)",
    defaultModel: "openai/gpt-oss-120b",
    placeholderKey: "gsk_...",
    hint: "Obtenha no Groq Console (console.groq.com).",
  },
  grok: {
    label: "xAI Grok",
    defaultModel: "grok-3-mini",
    placeholderKey: "xai-...",
    hint: "Obtenha no console da xAI (console.x.ai).",
  },
  openrouter: {
    label: "OpenRouter (Multi-modelos)",
    defaultModel: "google/gemini-2.5-flash",
    placeholderKey: "sk-or-v1-...",
    hint: "Obtenha em openrouter.ai para usar centenas de modelos.",
  },
};

export function isAiProviderId(val: string): val is AiProviderId {
  return val in AI_PROVIDER_INFO;
}

const OPENAI_COMPATIBLE_ENDPOINTS: Record<
  Exclude<AiProviderId, "gemini" | "claude">,
  string
> = {
  openai: "https://api.openai.com/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  grok: "https://api.x.ai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

interface CallProviderParams {
  provider: AiProviderId;
  model: string;
  apiKey: string;
  systemPrompt: string;
  messages: AiTurnMessage[];
  tools: AiToolDefinition[];
  toolRounds?: Array<Array<{ call: AiToolCall; result: unknown }>>;
}

/**
 * Executa uma chamada ao provedor configurado com suporte unificado a Tool Calling.
 */
export async function callAiProvider(params: CallProviderParams): Promise<AiModelResponse> {
  const { provider } = params;
  if (provider === "gemini") {
    return callGemini(params);
  }
  if (provider === "claude") {
    return callClaude(params);
  }
  return callOpenAiCompatible(params, OPENAI_COMPATIBLE_ENDPOINTS[provider]);
}

async function callGemini(params: CallProviderParams): Promise<AiModelResponse> {
  const { model, apiKey, systemPrompt, messages, tools, toolRounds } = params;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents: Array<Record<string, unknown>> = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  if (toolRounds && toolRounds.length > 0) {
    for (const round of toolRounds) {
      if (round.length === 0) continue;
      contents.push({
        role: "model",
        parts: round.map((tr) => ({
          functionCall: {
            name: tr.call.name,
            args: tr.call.args,
          },
        })),
      });
      contents.push({
        role: "user",
        parts: round.map((tr) => ({
          functionResponse: {
            name: tr.call.name,
            response: { result: tr.result },
          },
        })),
      });
    }
  }

  const body: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  };

  if (tools.length > 0) {
    body.tools = [
      {
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    ];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw await formatProviderError("Gemini", res);
  }

  const data = await res.json();
  const parts: Array<Record<string, unknown>> =
    data?.candidates?.[0]?.content?.parts ?? [];

  const textParts: string[] = [];
  const toolCalls: AiToolCall[] = [];

  for (const part of parts) {
    if (typeof part.text === "string" && part.text.trim()) {
      textParts.push(part.text);
    }
    if (part.functionCall && typeof part.functionCall === "object") {
      const fc = part.functionCall as { name?: string; args?: Record<string, unknown> };
      if (fc.name) {
        toolCalls.push({
          id: `gemini_${Date.now()}_${toolCalls.length}`,
          name: fc.name,
          args: fc.args ?? {},
        });
      }
    }
  }

  return {
    text: textParts.join("\n").trim(),
    toolCalls,
  };
}

async function callClaude(params: CallProviderParams): Promise<AiModelResponse> {
  const { model, apiKey, systemPrompt, messages, tools, toolRounds } = params;
  const url = "https://api.anthropic.com/v1/messages";

  const claudeMessages: Array<Record<string, unknown>> = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (toolRounds && toolRounds.length > 0) {
    for (const round of toolRounds) {
      if (round.length === 0) continue;
      claudeMessages.push({
        role: "assistant",
        content: round.map((tr) => ({
          type: "tool_use",
          id: tr.call.id,
          name: tr.call.name,
          input: tr.call.args,
        })),
      });
      claudeMessages.push({
        role: "user",
        content: round.map((tr) => ({
          type: "tool_result",
          tool_use_id: tr.call.id,
          content: JSON.stringify(tr.result),
        })),
      });
    }
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: 2048,
    temperature: 0.2,
    system: systemPrompt,
    messages: claudeMessages,
  };

  if (tools.length > 0) {
    body.tools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw await formatProviderError("Claude", res);
  }

  const data = await res.json();
  const contentBlocks: Array<Record<string, unknown>> = data?.content ?? [];
  const textParts: string[] = [];
  const toolCalls: AiToolCall[] = [];

  for (const block of contentBlocks) {
    if (block.type === "text" && typeof block.text === "string") {
      textParts.push(block.text);
    } else if (block.type === "tool_use" && typeof block.name === "string") {
      toolCalls.push({
        id: typeof block.id === "string" ? block.id : `claude_${Date.now()}_${toolCalls.length}`,
        name: block.name,
        args: (block.input as Record<string, unknown>) ?? {},
      });
    }
  }

  return {
    text: textParts.join("\n").trim(),
    toolCalls,
  };
}

async function callOpenAiCompatible(
  params: CallProviderParams,
  endpoint: string,
): Promise<AiModelResponse> {
  const { provider, model, apiKey, systemPrompt, messages, tools, toolRounds } = params;

  const chatMessages: Array<Record<string, unknown>> = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  if (toolRounds && toolRounds.length > 0) {
    for (const round of toolRounds) {
      if (round.length === 0) continue;
      chatMessages.push({
        role: "assistant",
        content: null,
        tool_calls: round.map((tr) => ({
          id: tr.call.id,
          type: "function",
          function: {
            name: tr.call.name,
            arguments: JSON.stringify(tr.call.args),
          },
        })),
      });

      for (const tr of round) {
        chatMessages.push({
          role: "tool",
          tool_call_id: tr.call.id,
          content: JSON.stringify(tr.result),
        });
      }
    }
  }

  const body: Record<string, unknown> = {
    model,
    messages: chatMessages,
    temperature: 0.2,
    max_tokens: 2500,
  };

  if (tools.length > 0) {
    body.tools = tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
    body.tool_choice = "auto";
  }

  let res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  // Na Groq os limites gratuitos (TPM/RPM) são separados por modelo: se bater
  // 429, fazemos fallback em cascata pelos modelos ativos da conta antes de falhar.
  if (res.status === 429 && provider === "groq") {
    const fallbackModels = [
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
    ].filter((m) => m !== model);

    for (const fallbackModel of fallbackModels) {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...body, model: fallbackModel }),
      });
      if (res.status !== 429) break;
    }
  }

  if (!res.ok) {
    throw await formatProviderError(AI_PROVIDER_INFO[provider].label, res);
  }

  const data = await res.json();
  const choice = data?.choices?.[0]?.message;
  const text = typeof choice?.content === "string" ? choice.content.trim() : "";
  const rawCalls: Array<Record<string, unknown>> = choice?.tool_calls ?? [];

  const toolCalls: AiToolCall[] = [];
  for (const rc of rawCalls) {
    const fn = rc.function as { name?: string; arguments?: string } | undefined;
    if (fn?.name) {
      let parsedArgs: Record<string, unknown> = {};
      if (typeof fn.arguments === "string" && fn.arguments.trim()) {
        try {
          parsedArgs = JSON.parse(fn.arguments);
        } catch {
          parsedArgs = {};
        }
      }
      toolCalls.push({
        id: typeof rc.id === "string" ? rc.id : `call_${Date.now()}_${toolCalls.length}`,
        name: fn.name,
        args: parsedArgs,
      });
    }
  }

  return { text, toolCalls };
}

async function formatProviderError(providerLabel: string, res: Response): Promise<Error> {
  let detail = "";
  try {
    const errJson = await res.json();
    detail =
      errJson?.error?.message ||
      errJson?.message ||
      (typeof errJson?.error === "string" ? errJson.error : "");
  } catch {
    // ignora corpo inválido
  }

  if (res.status === 401 || res.status === 403) {
    return new Error(
      `Chave de API inválida ou sem permissão no provedor ${providerLabel}. Verifique as Configurações.`,
    );
  }
  if (res.status === 429) {
    return new Error(
      `Limite de requisições atingido no provedor ${providerLabel}. Aguarde alguns instantes e tente novamente.`,
    );
  }
  if (res.status === 404) {
    return new Error(
      `Modelo não encontrado no provedor ${providerLabel}. Confira o nome do modelo nas Configurações.`,
    );
  }
  return new Error(
    detail
      ? `Erro no provedor ${providerLabel}: ${detail.slice(0, 140)}`
      : `Não foi possível comunicar com o provedor ${providerLabel} (HTTP ${res.status}).`,
  );
}


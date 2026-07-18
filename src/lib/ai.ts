const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "deepseek-ai/deepseek-v4-pro";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function streamAssistantReply(messages: ChatMessage[]): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY no configurada.");

  const upstream = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 1,
      top_p: 0.95,
      max_tokens: 1024,
      chat_template_kwargs: { thinking: false },
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    throw new Error(`NVIDIA API error (${upstream.status}): ${detail.slice(0, 300)}`);
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let finished = false;

  function extractDelta(payload: string): string | null {
    try {
      const json = JSON.parse(payload);
      const delta = json.choices?.[0]?.delta?.content;
      return typeof delta === "string" ? delta : null;
    } catch {
      return null;
    }
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (finished) {
        controller.close();
        return;
      }

      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          // El servidor puede tardar en cerrar la conexión física; en cuanto
          // vemos el sentinel de fin de stream, cerramos ya sin esperarlo.
          finished = true;
          controller.close();
          reader.cancel().catch(() => {});
          return;
        }
        const delta = extractDelta(payload);
        if (delta) controller.enqueue(encoder.encode(delta));
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

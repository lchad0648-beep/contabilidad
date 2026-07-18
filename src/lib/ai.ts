const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "nvidia/nemotron-3-ultra-550b-a55b";

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
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 1024,
      chat_template_kwargs: { enable_thinking: false },
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
      const { done, value } = await reader.read();
      if (done) {
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
        if (payload === "[DONE]") continue;
        const delta = extractDelta(payload);
        if (delta) controller.enqueue(encoder.encode(delta));
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

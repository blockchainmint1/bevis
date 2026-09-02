/**
 * Operator alerts over Telegram.
 *
 * Server-only. Messages go through the Lovable connector gateway, so no bot
 * token ever lives in this repo. The destination chat is a project secret.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

export async function sendTelegramAlert(text: string): Promise<{ ok: boolean; error?: string }> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["TELEGRAM_API_KEY"];
  const chatId = process.env["TELEGRAM_ALERT_CHAT_ID"];
  if (!lovableKey || !connectionKey) return { ok: false, error: "Telegram is not connected." };
  if (!chatId) return { ok: false, error: "TELEGRAM_ALERT_CHAT_ID is not set." };

  try {
    const res = await fetch(`${GATEWAY}/sendMessage`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error(`Telegram alert failed [${res.status}]: ${body}`);
      return { ok: false, error: `Telegram ${res.status}: ${body}` };
    }
    const json = JSON.parse(body) as { ok?: boolean; error?: string; description?: string };
    if (json.ok === false) {
      console.error("Telegram alert rejected:", body);
      return { ok: false, error: json.description ?? "Telegram rejected the message." };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

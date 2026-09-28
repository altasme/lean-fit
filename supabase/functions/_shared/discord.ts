// Shared Discord webhook posting helper - client request: "connect this to
// Discord" for new-order notifications, new-partner-signup notifications,
// and a weekly order management report (three separate channels/webhooks,
// per the client's own preference).
//
// Uses Discord's plain incoming-webhook API (no bot, no OAuth) - see
// https://discord.com/developers/docs/resources/webhook#execute-webhook.
// Each webhook URL is itself the credential (anyone holding it can post to
// that channel), so it's always read from an env var/secret here, never
// hardcoded or passed from the client.
//
// `_shared/` is a Supabase CLI convention - never deployed as its own
// function, only importable by the others (see _shared/cors.ts).

const GOLD = 0xd4af37;

export type DiscordEmbedField = { name: string; value: string; inline?: boolean };

/**
 * Fire-and-forget: logs on failure but never throws, so a Discord outage
 * (or a webhook URL that was never configured) never blocks the order/
 * email/report flow that triggered it.
 */
export async function postDiscordEmbed(
  webhookUrl: string | undefined,
  title: string,
  fields: DiscordEmbedField[],
  opts?: { url?: string; description?: string },
): Promise<void> {
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title,
            description: opts?.description,
            url: opts?.url,
            color: GOLD,
            fields,
            timestamp: new Date().toISOString(),
            footer: { text: 'Lean & Fit' },
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error('Discord webhook failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Discord webhook request threw:', err);
  }
}

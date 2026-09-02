/**
 * House wallet watchdog.
 *
 * The house wallet funds every card top-up. If it runs dry, paid top-ups
 * fail. This checks its balance and pings the operator on Telegram when it
 * drops below the floor — at most once every few hours, so a long low spell
 * doesn't turn into a message storm.
 */

const LOW_TXC = Number(process.env["HOUSE_LOW_TXC"] ?? 1000);
const ALERT_KEY = "house_wallet_low";
const REALERT_MS = 6 * 60 * 60 * 1000;

export type HouseCheck = {
  address: string;
  balanceTxc: number;
  threshold: number;
  low: boolean;
  alerted: boolean;
  alertError?: string;
};

export async function checkHouseWallet(force = false): Promise<HouseCheck> {
  const { anchorWalletStatus } = await import("./txc.server");
  const status = await anchorWalletStatus(null);
  const low = status.balanceTxc < LOW_TXC;

  const result: HouseCheck = {
    address: status.address,
    balanceTxc: status.balanceTxc,
    threshold: LOW_TXC,
    low,
    alerted: false,
  };
  if (!low && !force) return result;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;

  if (!force) {
    const { data: prev } = await db
      .from("ops_alert_state")
      .select("last_sent_at")
      .eq("key", ALERT_KEY)
      .maybeSingle();
    if (prev?.last_sent_at && Date.now() - new Date(prev.last_sent_at).getTime() < REALERT_MS) {
      return result;
    }
  }

  const { sendTelegramAlert } = await import("@/lib/notify.server");
  const sent = await sendTelegramAlert(
    [
      "⚠️ <b>BEVIS house wallet is low</b>",
      "",
      `Balance: <b>${status.balanceTxc.toFixed(4)} TXC</b>`,
      `Threshold: ${LOW_TXC} TXC`,
      `Address: <code>${status.address}</code>`,
      "",
      "Card top-ups are paid out of this wallet — fund it to keep them settling.",
      `https://mempool.texitcoin.org/address/${status.address}`,
    ].join("\n"),
  );

  result.alerted = sent.ok;
  if (!sent.ok) result.alertError = sent.error;

  if (sent.ok) {
    await db
      .from("ops_alert_state")
      .upsert(
        { key: ALERT_KEY, last_sent_at: new Date().toISOString(), last_value: status.balanceTxc },
        { onConflict: "key" },
      );
  }
  return result;
}

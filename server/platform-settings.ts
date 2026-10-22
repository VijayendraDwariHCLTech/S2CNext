import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

export const AI_PROVIDER_MODES = ["foundry", "built-in-llm", "guided-fallback"] as const;
export type AiProviderMode = (typeof AI_PROVIDER_MODES)[number];

const SETTING_KEY = "ai_provider_mode";
const DEFAULT_MODE: AiProviderMode = "foundry";

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
    pool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 4, charset: "utf8mb4" });
  }
  return pool;
}

function isMode(value: unknown): value is AiProviderMode {
  return typeof value === "string" && (AI_PROVIDER_MODES as readonly string[]).includes(value);
}

export async function getAiProviderMode(): Promise<AiProviderMode> {
  try {
    const [rows] = await getPool().query<(RowDataPacket & { setting_value: string })[]>(
      "SELECT setting_value FROM platform_settings WHERE setting_key = ? LIMIT 1",
      [SETTING_KEY],
    );
    return isMode(rows[0]?.setting_value) ? rows[0].setting_value : DEFAULT_MODE;
  } catch (error) {
    // Keep the platform usable during an upgrade or if the optional settings
    // table has not been created yet; the migration will make this persistent.
    console.warn("[Settings] Could not read AI provider mode; using default:", error instanceof Error ? error.message : error);
    return DEFAULT_MODE;
  }
}

export async function setAiProviderMode(mode: AiProviderMode, updatedBy = "admin") {
  if (!isMode(mode)) throw new Error(`Unsupported AI provider mode: ${String(mode)}`);
  await getPool().execute(
    `INSERT INTO platform_settings (setting_key, setting_value, updated_by)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
    [SETTING_KEY, mode, updatedBy],
  );
  return { mode };
}

export function getAiProviderModeOptions() {
  return AI_PROVIDER_MODES.map((mode) => ({ mode, label: mode === "foundry" ? "Foundry agent" : mode === "built-in-llm" ? "Built-in LLM" : "Guided fallback" }));
}

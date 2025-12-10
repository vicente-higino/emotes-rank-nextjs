import { DateRange, TZDate } from "react-day-picker";

export interface EmotesRequest {
  data: Emote[];
  meta: Meta | null;
}

export interface Emote {
  emoteName: string;
  emoteId: string | null;
  usage_count: number;
  provider: "SevenTV" | "Twitch" | "FFZ" | "BTTV";
  rank: number;
  imageUrl: string;
}

export interface Meta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  channelId: string;
  channelName: string;
  channelDisplayName: string;
}
// =======================
// Constants
// =======================
export const EmoteProvider = { Twitch: "Twitch", BTTV: "BTTV", FFZ: "FFZ", SevenTV: "SevenTV" } as const;

export type EmoteProviders = keyof typeof EmoteProvider;
export const enabledChannels = ["fuslie", "fukura____", "v_cn_t"] as const;
export type enabledChannel = keyof typeof enabledChannels;
export function getChannels() {
  return enabledChannels;
}

export const ProviderColor = { Twitch: "purple", BTTV: "red", FFZ: "brown", SevenTV: "blue" } as const;
const DEFAULT_USER_ID = "fuslie";
const HOST = process.env.NEXT_PUBLIC_API_URL;
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
// =======================
// Utility Functions
// =======================

export async function getEmotes(username: string, searchParams: string): Promise<EmotesRequest> {
  const api = `${HOST}/api/emotes/rank/${username ?? DEFAULT_USER_ID}?${searchParams}`;
  try {
    const res = await fetch(api);
    if (!res.ok) {
      return { data: [], meta: null };
    }
    const json = await res.json();
    return json as EmotesRequest;
  } catch (err) {
    return { data: [], meta: null };
  }
}
export function getEmoteUrl(provider: string | null, emoteId: string | null): string {
  if (!emoteId) return BLANK;
  const p = (provider ?? "").toLowerCase();
  if (p.includes("twitch")) {
    return `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/3.0`;
  }
  if (p.includes("bttv") || p.includes("betterttv")) {
    return `https://cdn.betterttv.net/emote/${emoteId}/3x`;
  }
  if (p.includes("ffz") || p.includes("frankerfacez")) {
    return `https://cdn.frankerfacez.com/emoticon/${emoteId}/4`;
  }
  if (p.includes("7tv") || p.includes("seventv") || p.includes("seven")) {
    return `https://cdn.7tv.app/emote/${emoteId}/4x`;
  }
  return BLANK;
}
export function getEmotePageUrl(provider: string | null, emoteId: string | null): string | null {
  if (!emoteId || !provider) return null;
  const p = provider.toLowerCase();
  if (p.includes("twitch")) {
    // No dedicated page, just use the image URL
    return getEmoteUrl(provider, emoteId);
  }
  if (p.includes("bttv") || p.includes("betterttv")) {
    return `https://betterttv.com/emotes/${emoteId}`;
  }
  if (p.includes("ffz") || p.includes("frankerfacez")) {
    return `https://www.frankerfacez.com/emoticon/${emoteId}`;
  }
  if (p.includes("7tv") || p.includes("seventv") || p.includes("seven")) {
    return `https://7tv.app/emotes/${emoteId}`;
  }
  return null;
}
const providerAliases: Record<string, EmoteProviders> = {
  twitch: EmoteProvider.Twitch,
  bttv: EmoteProvider.BTTV,
  ffz: EmoteProvider.FFZ,
  "7tv": EmoteProvider.SevenTV,
  seventv: EmoteProvider.SevenTV,
};

export function parseProviders(args: string[]): EmoteProviders[] {
  if (!args.length) return [];
  const providers: EmoteProviders[] = [];
  for (const arg of args) {
    const key = arg.toLowerCase();
    if (providerAliases[key]) {
      providers.push(providerAliases[key]);
    }
  }
  return providers.length ? providers : [];
}

export function normalizeDateRange(from?: Date | string | null, to?: Date | string | null) {
  if (!from || !to) {
    return { from: null, to: null };
  }
  const start = new TZDate(new Date(from), "UTC");
  start.setUTCHours(0, 0, 0, 0);

  const end = new TZDate(new Date(to), "UTC");
  end.setUTCHours(23, 59, 59, 999);

  return { from: start.toISOString(), to: end.toISOString() };
}

export function toDateRange({ from, to }: { from: string | null; to: string | null }): DateRange | undefined {
  if (!from && !to) {
    return undefined;
  }
  const range: DateRange = { from: undefined };
  if (from) {
    range.from = new TZDate(from, "UTC");
  }
  if (to) {
    range.to = new TZDate(to, "UTC");
  }
  return range;
}

import Rank, { Action, State } from "./rank";
import { ReadonlyURLSearchParams } from "next/navigation";
import { enabledChannels, EmoteProvider, getEmotes, getEmoteUrl, normalizeDateRange, parseProviders, toDateRange } from "../util";
import { Suspense } from "react";

export function fetchRank(searchParams: ReadonlyURLSearchParams | URLSearchParams, state: State, dispatch: (action: Action) => void) {
  return async () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("perPage", state.perPage);
    params.set("page", state.page.toString());
    if (state.providerFilter.length !== Object.values(EmoteProvider).length) {
      params.set("providers", state.providerFilter.join(","));
    }
    if (state.filterDateRange.from) {
      params.set("from", state.filterDateRange.from);
    }
    if (state.filterDateRange.to) {
      params.set("to", state.filterDateRange.to);
    }
    if (state.onlyCurrentEmotes) {
      params.set("onlyCurrentEmotes", "true");
    }

    const data = await getEmotes(state.channel, params.toString());
    for (const emote of data.data) {
      emote.imageUrl = getEmoteUrl(emote.provider, emote.emoteId);
    }

    let page = data.meta?.page ?? 1;
    const total = data.meta?.totalPages ?? 1;
    if (page > total) {
      page = total;
    }

    dispatch({ type: "SET_PAGE", page });
    dispatch({ type: "SET_TOTAL_PAGES", total });
    dispatch({ type: "RESET_CHANGED" });
    return data;
  };
}
export function getDefaultState(searchParams: ReadonlyURLSearchParams | URLSearchParams, channel?: string): State {
  const state = {
    rows: [],
    sortColumns: [],
    channel: channel ?? "fuslie",
    page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
    perPage: "100",
    totalPages: 1,
    dateRangeSelection: toDateRange(normalizeDateRange(searchParams.get("from"), searchParams.get("to"))) ?? undefined,
    filterDateRange: normalizeDateRange(searchParams.get("from"), searchParams.get("to")),
    month: undefined,
    providerFilter: searchParams.get("providers")
      ? parseProviders(searchParams.get("providers")!.split(",")).toSorted()
      : Object.values(EmoteProvider).toSorted(),
    dateRangeSelectionDiaglogOpen: false,
    onlyCurrentEmotes: !!searchParams.get("onlyCurrentEmotes"),
    enableVirt: false,
  };
  return state;
}

export async function generateStaticParams() {
  return enabledChannels.map(username => ({ username }));
}

export const dynamicParams = false;

export default async function Page(props: PageProps<"/[username]">) {
  return (
    <Suspense>
      <Rank />
    </Suspense>
  );
}

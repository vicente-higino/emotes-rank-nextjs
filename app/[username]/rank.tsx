"use client";

import ProviderIcon from "@/app/components/ProviderIcon";
import {
  Emote,
  EmoteProvider,
  getEmotePageUrl,
  getEmotes,
  getEmoteUrl,
  getRange,
  normalizeDateRange,
  parseProviders,
  ProviderColor,
} from "@/app/util";
import {
  AvatarIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { Button, CheckboxGroup, Dialog, Flex, Grid, IconButton, Link, RadioGroup, Section, Select, Spinner, Switch, Text, TextField } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import Fuse from "fuse.js";
import { ReadonlyURLSearchParams, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Column, DataGrid, SortColumn } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { type DateRange, DayPicker } from "react-day-picker";
import { Image } from "../components/Image";

const columns: readonly Column<Emote>[] = [
  { key: "rank", name: "Rank", width: 60, sortable: true },
  { key: "emoteName", name: "Name", resizable: true },
  {
    key: "imageUrl",
    name: "Emote",
    resizable: true,
    renderCell: ({ row }: { row: Emote }) => <Image emoteName={row.emoteName} imageUrl={row.imageUrl} />,
  },
  {
    key: "provider",
    name: "Provider",
    resizable: true,
    renderCell: ({ row }: { row: Emote }) => {
      const url = getEmotePageUrl(row.provider, row.emoteId);
      if (!url) return row.provider;
      return (
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          color={ProviderColor[row.provider]}
          size={"4"}
          weight={"bold"}
          title={`Open ${row.provider} emote page`}>
          <ProviderIcon fallback={row.provider} provider={row.provider} size={"2"} />
        </Link>
      );
    },
  },
  { key: "usage_count", name: "Count", resizable: true, sortable: true },
];

type State = {
  rows: Emote[];
  sortColumns: readonly SortColumn[];
  channel: string;
  page: number;
  perPage: string;
  totalPages: number;
  dateRangeSelection: DateRange | undefined;
  filterDateRange: { from: string | null; to: string | null };
  month: Date | undefined;
  providerFilter: string[];
  dateRangeSelectionDiaglogOpen: boolean;
  onlyCurrentEmotes: boolean;
  enableVirt: boolean;
  isGroupById: boolean;
  users: string[];
  userScope: "all" | "include" | "exclude";
};

type Action =
  | { type: "SET_ROWS"; rows: Emote[] }
  | { type: "SET_SORT"; sort: readonly SortColumn[] }
  | { type: "SET_CHANNEL"; channel: string }
  | { type: "SET_PAGE"; page: number }
  | { type: "SET_PER_PAGE"; perPage: string }
  | { type: "SET_TOTAL_PAGES"; total: number }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_SELECTED_RANGE"; range: DateRange | undefined }
  | { type: "SET_MONTH"; month: Date | undefined }
  | { type: "SET_PROVIDER_FILTER"; providers: string[] }
  | { type: "SET_OPEN"; open: boolean }
  | { type: "SET_ONLY_CURRENT"; value: boolean }
  | { type: "SET_IS_GROUP_BY_ID"; value: boolean }
  | { type: "SET_USERS"; users: string[]; userScope: "all" | "include" | "exclude" }
  | { type: "RESET_CHANGED" };

function reducer(state: State, action: Action): State {
  // All other actions = mark changed
  const newState = { ...state };

  switch (action.type) {
    case "SET_ROWS":
      return { ...newState, rows: action.rows };
    case "SET_SORT":
      return { ...newState, sortColumns: action.sort };
    case "SET_CHANNEL":
      return { ...newState, channel: action.channel };
    case "SET_PAGE":
      return { ...newState, page: action.page };
    case "SET_PER_PAGE":
      return { ...newState, perPage: action.perPage, enableVirt: parseInt(action.perPage) > 100 };
    case "SET_TOTAL_PAGES":
      return { ...newState, totalPages: action.total };
    case "SET_SELECTED_RANGE":
      return { ...newState, dateRangeSelection: action.range, month: action.range?.from ?? state.month };
    case "SET_MONTH":
      return { ...newState, month: action.month };
    case "SET_PROVIDER_FILTER":
      return { ...newState, providerFilter: action.providers.toSorted() };
    case "SET_IS_GROUP_BY_ID":
      return { ...newState, isGroupById: action.value };
    case "SET_USERS":
      return { ...newState, users: action.users.toSorted(), userScope: action.userScope };
    case "SET_OPEN":
      return {
        ...newState,
        filterDateRange: action.open
          ? state.filterDateRange
          : normalizeDateRange(state.dateRangeSelection?.from ?? null, state.dateRangeSelection?.to ?? null),
        dateRangeSelectionDiaglogOpen: action.open,
      };
    case "SET_ONLY_CURRENT":
      if (action.value) {
        return {
          ...newState,
          onlyCurrentEmotes: action.value,
          page: 1,
          totalPages: 1,
          providerFilter: action.value ? state.providerFilter.filter(p => p !== EmoteProvider.Twitch) : state.providerFilter,
        };
      }
      return { ...newState, onlyCurrentEmotes: action.value, providerFilter: Object.values(EmoteProvider).toSorted() };

    default:
      return state;
  }
}

export default function RankPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const channel = pathname.replace("/", "");
  const [state, dispatch] = useReducer(reducer, getDefaultState(searchParams, channel));
  const queryFilter = useDebounce(state, 1000);
  const getRows = fetchRank(searchParams, state, dispatch);
  const [emoteNameFilter, setEmoteNameFilter] = useState<string | undefined>();
  const emoteNameFilterDebounce = useDebounce(emoteNameFilter, 250);

  const { isLoading, isError, data, error, refetch } = useQuery({
    queryKey: [
      "emotes",
      state.channel,
      state.page,
      state.perPage,
      state.filterDateRange?.from,
      state.filterDateRange?.to,
      state.isGroupById,
      queryFilter.userScope,
      ...queryFilter.users,
      queryFilter.onlyCurrentEmotes,
      ...queryFilter.providerFilter,
    ],
    queryFn: () => getRows(),
  });

  useEffect(() => {
    if (state.onlyCurrentEmotes) return;
    refetch();
  }, [state.onlyCurrentEmotes]);

  const sortedRows = useMemo(() => {
    if (!data?.data) return [];
    if (state.sortColumns.length === 0 && state.providerFilter.length === 4 && !emoteNameFilterDebounce?.length) return data.data;

    const rows = data.data
      .toSorted((a, b) => {
        for (const sort of state.sortColumns) {
          const comp = a.rank - b.rank;
          return sort.direction === "ASC" ? comp : -comp;
        }
        return 0;
      })
      .filter(e => state.providerFilter.includes(e.provider));
    if (emoteNameFilterDebounce) {
      const options = { useExtendedSearch: true, shouldSort: false, threshold: 0.3, keys: ["emoteName", "rank", "provider"] };
      const fuse = new Fuse(rows, options);
      const filter = fuse.search(emoteNameFilterDebounce);
      return filter.map(e => e.item);
    }

    return rows;
  }, [data, state.sortColumns, state.providerFilter, emoteNameFilterDebounce]);

  const EmptyRowsRenderer = () => {
    return (
      <Grid gap="2" align="center" justify="center" style={{ height: "100%", width: "100%", gridColumn: "1/-1" }}>
        <Flex direction="column" align="center" gap="2">
          {isLoading ? (
            <Spinner size="3" />
          ) : (
            <>
              <Text size="4" weight="bold">
                No Emotes Found
              </Text>
              <Text size="2">Try adjusting your filters or date range.</Text>
            </>
          )}
        </Flex>
      </Grid>
    );
  };

  return (
    <div className="w-full">
      <Section size={"1"}>
        <Flex direction={"column"} gap={"3"} align={"center"} className="w-full ">
          <CheckboxGroup.Root
            disabled={isLoading}
            value={state.providerFilter}
            onValueChange={v => dispatch({ type: "SET_PROVIDER_FILTER", providers: v })}
            className="flex-row! flex-wrap">
            {Object.values(EmoteProvider).map(p => (
              <CheckboxGroup.Item key={p} value={p} disabled={state.onlyCurrentEmotes && p === EmoteProvider.Twitch} className="items-center">
                <ProviderIcon provider={p} fallback={p} />
              </CheckboxGroup.Item>
            ))}
          </CheckboxGroup.Root>

          <Flex gap={"2"} align={"stretch"} className="flex-col-reverse md:flex-row">
            <Dialog.Root open={state.dateRangeSelectionDiaglogOpen} onOpenChange={v => dispatch({ type: "SET_OPEN", open: v })}>
              <Dialog.Trigger>
                <Button disabled={isLoading}>
                  <CalendarIcon />{" "}
                  {state.dateRangeSelection ? (
                    <>
                      {state.dateRangeSelection.from?.toLocaleDateString()} <DoubleArrowRightIcon />{" "}
                      {state.dateRangeSelection.to?.toLocaleDateString()}
                    </>
                  ) : (
                    "Select Range"
                  )}
                </Button>
              </Dialog.Trigger>
              <Dialog.Content width="fit-content">
                <Dialog.Title>Select Range</Dialog.Title>
                <Flex gap={"2"} align="center" className="flex-col! sm:flex-row!">
                  <DayPicker
                    mode="range"
                    reverseYears
                    month={state.month}
                    onMonthChange={m => dispatch({ type: "SET_MONTH", month: m })}
                    selected={state.dateRangeSelection}
                    onSelect={range => dispatch({ type: "SET_SELECTED_RANGE", range })}
                    captionLayout="dropdown"
                    // timeZone="UTC"
                    fixedWeeks
                    disabled={isLoading}
                    showOutsideDays
                  />
                  <Flex wrap={"wrap"} gap={"1"} className="flex-row! sm:flex-col!" align={"end"}>
                    <Button variant="outline" radius="full" onClick={() => dispatch({ type: "SET_SELECTED_RANGE", range: getRange("last_7_days") })}>
                      Last 7 Days
                    </Button>
                    <Button variant="outline" radius="full" onClick={() => dispatch({ type: "SET_SELECTED_RANGE", range: getRange("last_30_days") })}>
                      Last 30 Days
                    </Button>
                    <Button variant="outline" radius="full" onClick={() => dispatch({ type: "SET_SELECTED_RANGE", range: getRange("this_week") })}>
                      This Week
                    </Button>
                    <Button variant="outline" radius="full" onClick={() => dispatch({ type: "SET_SELECTED_RANGE", range: getRange("this_month") })}>
                      This Month
                    </Button>
                    <Button variant="outline" radius="full" onClick={() => dispatch({ type: "SET_SELECTED_RANGE", range: getRange("this_year") })}>
                      This Year
                    </Button>
                    <Button variant="outline" radius="full" onClick={() => dispatch({ type: "SET_SELECTED_RANGE", range: getRange("last_week") })}>
                      Last Week
                    </Button>
                    <Button variant="outline" radius="full" onClick={() => dispatch({ type: "SET_SELECTED_RANGE", range: getRange("last_month") })}>
                      Last Month
                    </Button>
                    <Button variant="outline" radius="full" onClick={() => dispatch({ type: "SET_SELECTED_RANGE", range: getRange("last_year") })}>
                      Last Year
                    </Button>
                    <Button variant="outline" radius="full" onClick={() => dispatch({ type: "SET_SELECTED_RANGE", range: undefined })}>
                      Clear
                    </Button>
                  </Flex>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>
            <Text as="label" size="3" className="md:order-last">
              <Switch
                disabled={isLoading}
                checked={state.onlyCurrentEmotes}
                onCheckedChange={v => dispatch({ type: "SET_ONLY_CURRENT", value: v })}
                mr={"2"}
              />
              Active Emotes
            </Text>
            <Text as="label" size="3" className="md:order-last">
              <Switch
                disabled={isLoading}
                checked={!state.isGroupById}
                onCheckedChange={v => dispatch({ type: "SET_IS_GROUP_BY_ID", value: !v })}
                mr={"2"}
              />
              Combine Emotes
            </Text>
          </Flex>

          <TextField.Root
            placeholder="Filter emotes…"
            className="w-full max-w-sm"
            value={emoteNameFilter}
            onChange={e => setEmoteNameFilter(e.currentTarget.value)}>
            <TextField.Slot>
              <MagnifyingGlassIcon height="16" width="16" />
            </TextField.Slot>
          </TextField.Root>
          <UserSelection callback={(users, scope) => { dispatch({ type: 'SET_USERS', users, userScope: scope }) }} />


          <Flex gap={"5"} align={"center"}>
            <IconButton disabled={state.page === 1 || isLoading} onClick={() => dispatch({ type: "SET_PAGE", page: 1 })} variant="ghost">
              <DoubleArrowLeftIcon />
            </IconButton>

            <IconButton disabled={state.page === 1 || isLoading} onClick={() => dispatch({ type: "SET_PAGE", page: state.page - 1 })} variant="ghost">
              <ChevronLeftIcon />
            </IconButton>

            <Text>{state.page}</Text>

            <IconButton
              disabled={state.page === state.totalPages || isLoading}
              onClick={() => dispatch({ type: "SET_PAGE", page: state.page + 1 })}
              variant="ghost">
              <ChevronRightIcon />
            </IconButton>

            <IconButton
              disabled={state.page === state.totalPages || isLoading}
              onClick={() => dispatch({ type: "SET_PAGE", page: state.totalPages })}
              variant="ghost">
              <DoubleArrowRightIcon />
            </IconButton>
            <Select.Root
              disabled={isLoading}
              defaultValue="100"
              value={state.perPage}
              onValueChange={v => dispatch({ type: "SET_PER_PAGE", perPage: v })}>
              <Select.Trigger variant="ghost" radius="large" />
              <Select.Content>
                <Select.Item value="10">10</Select.Item>
                <Select.Item value="100">100</Select.Item>
                <Select.Item value="1000">1000</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>
      </Section>
      <DataGrid
        columns={columns}
        rows={sortedRows}
        style={{ minHeight: "100vh" }}
        sortColumns={state.sortColumns}
        rowHeight={40}
        onSortColumnsChange={cols => dispatch({ type: "SET_SORT", sort: cols })}
        renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
      />
    </div>
  );
}

function fetchRank(searchParams: ReadonlyURLSearchParams | URLSearchParams, state: State, dispatch: (action: Action) => void) {
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
    if (!state.isGroupById) {
      params.set("groupBy", "name");
    }
    if (state.userScope !== "all" && state.users && state.users.length > 0) {
      params.set("userScope", state.userScope);
      params.set("users", state.users.join(","));
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
function getDefaultState(searchParams: ReadonlyURLSearchParams | URLSearchParams, channel?: string): State {
  const range = getRange("last_7_days");
  const state = {
    rows: [],
    sortColumns: [],
    channel: channel ?? "fuslie",
    page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
    perPage: "100",
    totalPages: 1,
    dateRangeSelection: range,
    filterDateRange: normalizeDateRange(range.from, range.to),
    month: undefined,
    providerFilter: searchParams.get("providers")
      ? parseProviders(searchParams.get("providers")!.split(",")).toSorted()
      : Object.values(EmoteProvider).toSorted(),
    dateRangeSelectionDiaglogOpen: false,
    onlyCurrentEmotes: !!searchParams.get("onlyCurrentEmotes"),
    isGroupById: true,
    enableVirt: false,
    users: [],
    userScope: 'all' as const
  };
  return state;
}

function UserSelection(props: {
  callback: (users: string[], scope: "all" | "include" | "exclude") => void
}) {
  const [users, setUsers] = useState<string[]>([]);
  const [text, setText] = useState<string>("");
  const [scope, setScope] = useState<"all" | "include" | "exclude">("all");
  const [showError, setShowError] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (users.length == 0 && scope !== 'all') {
      setScope('all')
      return;
    }
    props.callback(users, scope)
  }, [users, scope])

  useEffect(() => {
    const valid = ref.current?.checkValidity() ?? true;
    setShowError(!valid)
  }, [text])


  return <Flex direction={'column'} gap={'2'} className="w-full max-w-sm">
    <TextField.Root
      placeholder="Filter users…"
      value={text}
      pattern="[a-zA-Z0-9]\w+"
      minLength={3}
      maxLength={25}
      ref={ref}
      aria-invalid={showError}
      onChange={e => {
        setText(e.currentTarget.value)
      }}
      onKeyDown={(e) => {
        if (e.key == 'Enter') {
          const set = new Set(users)
          if (text.length >= 3 && !set.has(text) && e.currentTarget.checkValidity()) {
            set.add(text);
            const newUsers = [...set.values()]
            setUsers(newUsers);
            if (newUsers.length > 0 && scope == 'all') {
              setScope("exclude")
            }
            setText("");
            setShowError(false);
          } else {
            setShowError(true);
          }
        }
      }}
    >
      <TextField.Slot>
        <AvatarIcon height="16" width="16" />
      </TextField.Slot>
    </TextField.Root>
    {users.length > 0 &&
      <RadioGroup.Root name="scope" value={scope} onValueChange={(v) => setScope(v as any)} className="flex-row!">
        <RadioGroup.Item value="all">All</RadioGroup.Item>
        <RadioGroup.Item value="include">Include</RadioGroup.Item>
        <RadioGroup.Item value="exclude">Exclude</RadioGroup.Item>
      </RadioGroup.Root>
    }
    <Flex wrap={"wrap"} gap={"1"} className="" align={"end"}>
      {users.length > 0 && users.map(user => {
        return <Button key={user} variant="outline" radius="full" onClick={() => setUsers((v) => { return v.filter((u) => u !== user) })}>{user}</Button>
      })}
    </Flex>
  </Flex>
}
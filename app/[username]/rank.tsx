"use client";

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, DoubleArrowLeftIcon, DoubleArrowRightIcon } from "@radix-ui/react-icons";
import {
  Button,
  CheckboxGroup,
  Dialog,
  Flex,
  Grid,
  Heading,
  IconButton,
  Link,
  Section,
  Select,
  Spinner,
  Switch,
  TabNav,
  Text,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import NextLink from "next/link";
import { useEffect, useMemo, useReducer, useState } from "react";
import { Column, DataGrid, SortColumn } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { type DateRange, DayPicker } from "react-day-picker";
import { Image } from "../componets/Image";
import { fetchRank, getDefaultState } from "./page";
import { Emote, EmoteProvider, getChannels, getEmotePageUrl, normalizeDateRange, ProviderColor } from "../util";

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
          {row.provider}
        </Link>
      );
    },
  },
  { key: "usage_count", name: "Usage Count", resizable: true, sortable: true },
];

export type State = {
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
};

export type Action =
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
      return { ...newState, dateRangeSelection: action.range };
    case "SET_MONTH":
      return { ...newState, month: action.month };
    case "SET_PROVIDER_FILTER":
      return { ...newState, providerFilter: action.providers.toSorted() };
    case "SET_OPEN":
      return {
        ...newState,
        filterDateRange: action.open ? state.filterDateRange : normalizeDateRange(state.dateRangeSelection?.from, state.dateRangeSelection?.to),
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

  const { isLoading, isError, data, error, refetch } = useQuery({
    queryKey: [
      "emotes",
      state.channel,
      state.page,
      state.perPage,
      state.filterDateRange?.from,
      state.filterDateRange?.to,
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
    if (state.sortColumns.length === 0 && state.providerFilter.length === 4) return data.data;

    return data.data
      .toSorted((a, b) => {
        for (const sort of state.sortColumns) {
          const comp = a.rank - b.rank;
          return sort.direction === "ASC" ? comp : -comp;
        }
        return 0;
      })
      .filter(e => state.providerFilter.includes(e.provider));
  }, [data, state.sortColumns, state.providerFilter]);

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
    <>
      <Section size={"1"}>
        <Flex direction={"column"} gap={"3"} align={"center"}>
          <CheckboxGroup.Root
            disabled={isLoading}
            value={state.providerFilter}
            onValueChange={v => dispatch({ type: "SET_PROVIDER_FILTER", providers: v })}
            style={{ flexDirection: "row" }}>
            {Object.values(EmoteProvider).map(p => (
              <CheckboxGroup.Item key={p} value={p} disabled={state.onlyCurrentEmotes && p === EmoteProvider.Twitch}>
                {p}
              </CheckboxGroup.Item>
            ))}
          </CheckboxGroup.Root>

          <Flex gap={"2"} align={"center"} className="flex-col-reverse md:flex-row">
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
                <Flex align="center" direction={"column"}>
                  <Dialog.Title>Select Range</Dialog.Title>
                  <DayPicker
                    mode="range"
                    reverseYears
                    month={state.month}
                    onMonthChange={m => dispatch({ type: "SET_MONTH", month: m })}
                    selected={state.dateRangeSelection}
                    onSelect={range => dispatch({ type: "SET_SELECTED_RANGE", range })}
                    captionLayout="dropdown"
                    timeZone="UTC"
                    fixedWeeks
                    disabled={isLoading}
                    showOutsideDays
                  />
                  <Button onClick={() => dispatch({ type: "SET_SELECTED_RANGE", range: undefined })}>Clear</Button>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>
            <Select.Root
              disabled={isLoading}
              defaultValue="100"
              value={state.perPage}
              onValueChange={v => dispatch({ type: "SET_PER_PAGE", perPage: v })}>
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="10">10</Select.Item>
                <Select.Item value="100">100</Select.Item>
                <Select.Item value="1000">1000</Select.Item>
              </Select.Content>
            </Select.Root>
            <Text as="label" size="3" className="md:order-last">
              <Switch
                disabled={isLoading}
                checked={state.onlyCurrentEmotes}
                onCheckedChange={v => dispatch({ type: "SET_ONLY_CURRENT", value: v })}
                mr={"2"}
              />
              Only Active Emotes
            </Text>
          </Flex>

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
          </Flex>
        </Flex>
      </Section>

      <div className="w-full">
        <DataGrid
          columns={columns}
          rows={sortedRows}
          style={{ minHeight: "100vh" }}
          sortColumns={state.sortColumns}
          rowHeight={40}
          enableVirtualization={state.enableVirt}
          onSortColumnsChange={cols => dispatch({ type: "SET_SORT", sort: cols })}
          renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
        />
      </div>
    </>
  );
}

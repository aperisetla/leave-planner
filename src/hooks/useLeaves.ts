"use client";

import useSWR from "swr";
import type { LeavesApiResponse, MembersApiResponse } from "@/types";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useLeaves(view: "month" | "quarter", date: Date, team?: string, memberId?: string) {
  const params = new URLSearchParams({
    view,
    date: date.toISOString(),
    ...(team     ? { team }     : {}),
    ...(memberId ? { memberId } : {}),
  });

  const { data, error, isLoading, mutate } = useSWR<LeavesApiResponse>(
    `/api/leaves?${params}`,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 } // auto-refresh every 5 min
  );

  return {
    entries: data?.entries ?? [],
    from: data?.from ? new Date(data.from) : null,
    to: data?.to ? new Date(data.to) : null,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useMembers(team?: string) {
  const params = team ? `?team=${team}` : "";
  const { data, error, isLoading } = useSWR<MembersApiResponse>(
    `/api/members${params}`,
    fetcher
  );

  return {
    members: data?.members ?? [],
    teams: data?.teams ?? [],
    isLoading,
    error,
  };
}

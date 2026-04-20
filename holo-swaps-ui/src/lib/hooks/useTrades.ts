import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tradesApi, ProposeTradePayload, TrackingPayload } from "@/lib/api/trades";
import { TradeStatus } from "@/types";

export const tradeKeys = {
  all: ["trades"] as const,
  lists: () => [...tradeKeys.all, "list"] as const,
  list: (filters: object) => [...tradeKeys.lists(), filters] as const,
  detail: (id: string) => [...tradeKeys.all, id] as const,
  matches: () => [...tradeKeys.all, "matches"] as const,
};

export const useMyTrades = (params?: {
  page?: number;
  limit?: number;
  status?: TradeStatus;
}) => {
  return useQuery({
    queryKey: tradeKeys.list(params || {}),
    queryFn: () => tradesApi.getMyTrades(params),
  });
};

export const useTrade = (tradeId: string) => {
  return useQuery({
    queryKey: tradeKeys.detail(tradeId),
    queryFn: () => tradesApi.getById(tradeId),
    enabled: !!tradeId,
  });
};

export const useTradeMatches = () => {
  return useQuery({
    queryKey: tradeKeys.matches(),
    queryFn: tradesApi.getMatches,
  });
};

export const useProposeTrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProposeTradePayload) => tradesApi.propose(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tradeKeys.lists() });
    },
  });
};

export const useAcceptTrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tradeId: string) => tradesApi.accept(tradeId),
    onSuccess: (_, tradeId) => {
      queryClient.invalidateQueries({ queryKey: tradeKeys.detail(tradeId) });
      queryClient.invalidateQueries({ queryKey: tradeKeys.lists() });
    },
  });
};

export const useDeclineTrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tradeId: string) => tradesApi.decline(tradeId),
    onSuccess: (_, tradeId) => {
      queryClient.invalidateQueries({ queryKey: tradeKeys.detail(tradeId) });
      queryClient.invalidateQueries({ queryKey: tradeKeys.lists() });
    },
  });
};

export const useCancelTrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tradeId: string) => tradesApi.cancel(tradeId),
    onSuccess: (_, tradeId) => {
      queryClient.invalidateQueries({ queryKey: tradeKeys.detail(tradeId) });
      queryClient.invalidateQueries({ queryKey: tradeKeys.lists() });
    },
  });
};

export const useSubmitTracking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tradeId, data }: { tradeId: string; data: TrackingPayload }) =>
      tradesApi.submitTracking(tradeId, data),
    onSuccess: (_, { tradeId }) => {
      queryClient.invalidateQueries({ queryKey: tradeKeys.detail(tradeId) });
    },
  });
};

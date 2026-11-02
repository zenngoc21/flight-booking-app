import { useQuery } from '@tanstack/react-query';
import { getPublicSettings } from '../services/api';

export function usePublicSettings() {
  return useQuery({
    queryKey: ['public-settings'],
    queryFn: getPublicSettings,
    select: (response) => response.data,
    refetchInterval: 30_000,
    refetchOnReconnect: true,
  });
}

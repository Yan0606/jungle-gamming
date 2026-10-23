import { queryOptions } from "@tanstack/react-query";
import { api, toApiError } from "@/lib/api";

export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: async () => {
    try {
      return await api.session();
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status === 401) return null;
      throw error;
    }
  },
  staleTime: 60_000,
});

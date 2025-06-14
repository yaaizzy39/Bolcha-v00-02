import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors (unauthorized)
      if (error?.status === 401) return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (reduced for more frequent updates)
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: true, // Re-enable to ensure fresh auth state
    refetchOnMount: true, // Re-enable to ensure fresh auth state
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
  };
}

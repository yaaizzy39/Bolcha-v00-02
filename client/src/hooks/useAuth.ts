import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors (unauthorized)
      if (error?.status === 401) return false;
      return failureCount < 2;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for more responsive updates
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false, // Disable to prevent unnecessary refetches
    refetchOnMount: false, // Disable to prevent unnecessary refetches
    refetchInterval: false, // Disable interval to reduce server load
    networkMode: 'online', // Only fetch when online
  });

  // Ensure user ID is always stored when user data is available
  useEffect(() => {
    if (user && (user as any)?.id) {
      const userId = String((user as any).id);
      localStorage.setItem('currentUserId', userId);
      localStorage.setItem('wsUserData', JSON.stringify(user));
      // Translation authentication disabled to prevent infinite loop
    }
  }, [user]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
  };
}

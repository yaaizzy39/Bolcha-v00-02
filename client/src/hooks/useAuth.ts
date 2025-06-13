import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Debug logging for authentication state
  console.log('Auth state:', {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    userId: user && typeof user === 'object' && 'id' in user ? (user as any).id : null
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type {
  User,
  Role,
  Page,
  CreateUserPayload,
  UpdateUserPayload,
} from '../model/types';

export const userKeys = {
  all: ['users'] as const,
  list: (page: number, pageSize = 20) => ['users', 'list', page, pageSize] as const,
  roles: ['roles'] as const,
};

/** Fetches a paginated list of users. */
export function useUsers(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: userKeys.list(page, pageSize),
    queryFn: async () => {
      const response = await apiClient.get<Page<User>>('/users', {
        params: { page, pageSize },
      });
      return response.data;
    },
  });
}

/** Fetches all available user roles. */
export function useRoles() {
  return useQuery({
    queryKey: userKeys.roles,
    queryFn: async () => {
      const response = await apiClient.get<Role[]>('/roles');
      return response.data;
    },
  });
}

/** Creates a new user and invalidates user list queries. */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const response = await apiClient.post<User>('/users', payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/** Updates an existing user and invalidates user list queries. */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateUserPayload;
    }) => {
      const response = await apiClient.patch<User>(`/users/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

import { api } from "./client";
import { ApiResponse, User, PaginatedResult, CollectionItem } from "@/types";

export const usersApi = {
  getProfile: async (username: string): Promise<User> => {
    const res = await api.get<ApiResponse<User>>(`/users/${username}`);
    return res.data.data!;
  },

  getCollection: async (username: string, page = 1, limit = 20): Promise<PaginatedResult<CollectionItem>> => {
    const res = await api.get<ApiResponse<PaginatedResult<CollectionItem>>>(
      `/users/${username}/collection`,
      { params: { page, limit } }
    );
    return res.data.data!;
  },

  follow: async (userId: string): Promise<void> => {
    await api.post(`/users/${userId}/follow`);
  },

  unfollow: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}/follow`);
  },

  getFollowers: async (username: string, page = 1, limit = 20): Promise<PaginatedResult<User>> => {
    const res = await api.get<ApiResponse<PaginatedResult<User>>>(
      `/users/${username}/followers`,
      { params: { page, limit } }
    );
    return res.data.data!;
  },

  getFollowing: async (username: string, page = 1, limit = 20): Promise<PaginatedResult<User>> => {
    const res = await api.get<ApiResponse<PaginatedResult<User>>>(
      `/users/${username}/following`,
      { params: { page, limit } }
    );
    return res.data.data!;
  },
};

import api from "./api";
import { AuthResponse, MessageResponse } from "@/types/auth";

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
  role?: "admin" | "creator" | "respondent";
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/register", payload);
    return data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/login", payload);
    return data;
  },

  me: async (): Promise<AuthResponse> => {
    const { data } = await api.get<AuthResponse>("/auth/me");
    return data;
  },

  refresh: async (): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/refresh");
    return data;
  },

  logout: async (): Promise<MessageResponse> => {
    const { data } = await api.post<MessageResponse>("/auth/logout");
    return data;
  },
};

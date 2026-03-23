import {
  AIGeneratedDraft,
  Form,
  FormAnalytics,
  FormListItem,
  FormPayload,
  PublicForm,
  PublishResponse,
  ResponseRow,
  SubmitRequest,
  SubmitResult,
} from "@/types/forms";

import api from "./api";

export const formsService = {
  listMine: async (): Promise<FormListItem[]> => {
    const { data } = await api.get<FormListItem[]>("/forms");
    return data;
  },

  create: async (payload: FormPayload): Promise<Form> => {
    const { data } = await api.post<Form>("/forms", payload);
    return data;
  },

  getById: async (id: number): Promise<Form> => {
    const { data } = await api.get<Form>(`/forms/${id}`);
    return data;
  },

  update: async (id: number, payload: FormPayload): Promise<Form> => {
    const { data } = await api.put<Form>(`/forms/${id}`, payload);
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/forms/${id}`);
  },

  publish: async (id: number): Promise<PublishResponse> => {
    const { data } = await api.post<PublishResponse>(`/forms/${id}/publish`);
    return data;
  },

  generateAI: async (prompt: string): Promise<AIGeneratedDraft> => {
    const { data } = await api.post<AIGeneratedDraft>("/forms/generate-ai", { prompt });
    return data;
  },

  getPublicBySlug: async (slug: string): Promise<PublicForm> => {
    const { data } = await api.get<PublicForm>(`/forms/public/${slug}`);
    return data;
  },

  submit: async (id: number, payload: SubmitRequest): Promise<SubmitResult> => {
    const { data } = await api.post<SubmitResult>(`/forms/${id}/submit`, payload);
    return data;
  },

  responses: async (id: number): Promise<ResponseRow[]> => {
    const { data } = await api.get<ResponseRow[]>(`/forms/${id}/responses`);
    return data;
  },

  analytics: async (id: number): Promise<FormAnalytics> => {
    const { data } = await api.get<FormAnalytics>(`/forms/${id}/analytics`);
    return data;
  },

  exportCsv: async (id: number): Promise<Blob> => {
    const { data } = await api.get(`/forms/${id}/responses/export`, { responseType: "blob" });
    return data;
  },
};

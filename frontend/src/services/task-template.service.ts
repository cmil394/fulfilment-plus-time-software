import api from "./api";

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskTemplatePayload {
  name: string;
  description?: string;
}

export interface UpdateTaskTemplatePayload {
  name?: string;
  description?: string;
}

export interface AssignTaskTemplatePayload {
  customerId: string | number;
}

export const taskTemplateService = {
  getAll: async (): Promise<TaskTemplate[]> => {
    const response = await api.get("/task-templates");
    return Array.isArray(response.data.data) ? response.data.data : [];
  },

  getById: async (id: string): Promise<TaskTemplate> => {
    const response = await api.get(`/task-templates/${id}`);
    return response.data.data;
  },

  create: async (payload: CreateTaskTemplatePayload): Promise<TaskTemplate> => {
    const response = await api.post("/task-templates", payload);
    return response.data.data;
  },

  update: async (
    id: string,
    payload: UpdateTaskTemplatePayload,
  ): Promise<TaskTemplate> => {
    const response = await api.patch(`/task-templates/${id}`, payload);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/task-templates/${id}`);
  },

  assign: async (
    id: string,
    payload: AssignTaskTemplatePayload,
  ): Promise<void> => {
    const response = await api.post(`/task-templates/${id}/assign`, payload);
    return response.data.data;
  },

  syncDescriptions: async (): Promise<{ updatedCount: number }> => {
    const response = await api.post("/task-templates/sync-descriptions");
    return response.data.data;
  },
};

import api from "./api";

export interface Task {
  id: number;
  name: string;
  description?: string;
  status: string;
  customerId: number;
}

export interface CreateTaskPayload {
  name: string;
  description?: string;
  customerId: string | number;
}

export const taskService = {
  getByCustomer: async (customerId: string): Promise<Task[]> => {
    const response = await api.get(`/tasks/customer/${customerId}`);
    return Array.isArray(response.data.data) ? response.data.data : [];
  },

  create: async (payload: CreateTaskPayload): Promise<Task> => {
    const response = await api.post("/tasks", payload);
    return response.data.data;
  },

  delete: async (taskId: number): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
  },
};

import api from "./api";

export interface Customer {
  id: string;
  name: string;
  ownerName: string;
  email?: string;
  phone?: string;
  createdAt: string;
  avatarUrl?: string;
  sortOrder: number;
}

export interface CustomerDto {
  name: string;
  ownerName: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
}

export const adminCustomerService = {
  getAll: async (): Promise<Customer[]> => {
    const response = await api.get("/customers");
    return response.data.data;
  },

  getById: async (id: string): Promise<Customer> => {
    const response = await api.get(`/customers/${id}`);
    return response.data.data;
  },

  create: async (data: CustomerDto): Promise<Customer> => {
    const response = await api.post("/customers", data);
    return response.data.data;
  },

  createWithFormData: async (formData: FormData): Promise<Customer> => {
    const response = await api.post("/customers", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  },

  update: async (id: string, data: CustomerDto): Promise<Customer> => {
    const response = await api.patch(`/customers/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`);
  },

  reorder: async (orderedIds: string[]): Promise<void> => {
    await api.patch("/customers/reorder", { orderedIds });
  },

  uploadAvatar: async (id: string, file: File): Promise<Customer> => {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await api.patch(`/customers/${id}/avatar`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  },
};

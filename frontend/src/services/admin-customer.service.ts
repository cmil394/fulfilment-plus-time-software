import api from "./api";

export interface Customer {
  id: string;
  name: string;
  ownerName: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

export interface CustomerDto {
  name: string;
  ownerName: string;
  phone?: number;
  email?: string;
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

  update: async (id: string, data: CustomerDto): Promise<Customer> => {
    const response = await api.patch(`/customers/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`);
  },
};

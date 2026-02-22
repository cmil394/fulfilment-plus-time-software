import api from "./api";

export interface Customer {
  id: string;
  name: string;
  email?: string;
}

export const customerService = {
  getAll: async (): Promise<Customer[]> => {
    const response = await api.get("/customers");
    return response.data.data;
  },

  getById: async (id: string): Promise<Customer> => {
    const response = await api.get(`/customers/${id}`);
    return response.data.data;
  },
};

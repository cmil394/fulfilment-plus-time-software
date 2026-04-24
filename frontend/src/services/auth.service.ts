import api from "./api";

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstname: string;
  lastname: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  employeeCode?: string;
  pin?: string;
  status: string;
  createdAt: string;
}

export interface GetPendingUsersResponse {
  status: string;
  data: {
    users: User[];
    total: number;
  };
}

export interface GetAcceptedUsersResponse {
  status: string;
  data: {
    users: User[];
    total: number;
  };
}

export interface AuthResponse {
  status: string;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export const authService = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", data);
    return response.data;
  },

  loginWithPin: async (employeeCode: string, pin: string): Promise<AuthResponse> => {
    const response = await api.post("/auth/login/pin", { employeeCode, pin });
    return response.data;
  },

  clockOut: async (token: string): Promise<void> => {
    await api.post("/auth/logout/pin", {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getProfile: async (): Promise<{ status: string; data: { user: User } }> => {
    const response = await api.get("/auth/profile");
    return response.data;
  },

  getPendingUsers: async (): Promise<GetPendingUsersResponse> => {
    const response = await api.get("/auth/admin/users/pending");
    return response.data;
  },

  getAllAcceptedUsers: async (): Promise<GetAcceptedUsersResponse> => {
    const response = await api.get("/auth/admin/users");
    return response.data;
  },

  getCurrentUserId: (): string | null => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.id ?? payload.sub ?? payload.userId ?? null;
    } catch {
      return null;
    }
  },

  getCurrentUserRole: (): string | null => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.role ?? null;
    } catch {
      return null;
    }
  },

  deleteUser: (userId: string) => api.delete(`/auth/admin/users/${userId}`),
  updateUser: (id: string, data: Partial<User>) =>
    api.patch(`/auth/admin/users/${id}`, data),
  approveUser: (id: string) => api.patch(`/auth/admin/users/${id}/approve`),
  rejectUser: (id: string) => api.patch(`/auth/admin/users/${id}/reject`),

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
};
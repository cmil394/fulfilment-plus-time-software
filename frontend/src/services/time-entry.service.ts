import api from "./api";

export interface TimeEntry {
  id: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  notes?: string;
  durationSeconds?: number;
  task: { name: string };
  customer: { id?: string; name: string };
}

export interface GroupedByCustomer {
  customer: { id: string; name: string };
  totalSeconds: number;
  entries: TimeEntry[];
}

export interface AdminCreateEntryPayload {
  userId: string;
  taskId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  notes?: string;
}

export interface UpdateEntryPayload {
  taskId?: string;
  startTime?: string; // ISO string
  endTime?: string; // ISO string
  notes?: string;
}

export const timeEntryService = {
  // Timer
  startTimer: async (taskId: number, notes?: string): Promise<TimeEntry> => {
    const res = await api.post("/time-entries/start", { taskId, notes });
    return res.data.data;
  },

  stopTimer: async (): Promise<TimeEntry> => {
    const res = await api.patch("/time-entries/active/stop");
    return res.data.data;
  },

  getActiveTimer: async (): Promise<TimeEntry | null> => {
    const res = await api.get("/time-entries/active");
    return res.data.data ?? null;
  },

  getAllActiveTimers: async (): Promise<TimeEntry[]> => {
    const res = await api.get("/time-entries/active/all");
    return res.data.data ?? [];
  },

  // User
  getMyEntries: async (): Promise<TimeEntry[]> => {
    const res = await api.get("/time-entries");
    return res.data.data ?? [];
  },

  // Admin
  getEntriesByUser: async (userId: string): Promise<GroupedByCustomer[]> => {
    const res = await api.get(`/time-entries/user/${userId}`);
    return res.data.data ?? [];
  },

  getEntriesByCustomer: async (
    customerId: string,
  ): Promise<GroupedByCustomer[]> => {
    const res = await api.get(`/time-entries/customer/${customerId}`);
    return res.data.data ?? [];
  },

  adminCreateEntry: async (
    payload: AdminCreateEntryPayload,
  ): Promise<TimeEntry> => {
    const res = await api.post("/time-entries/admin/create", payload);
    return res.data.data;
  },

  updateEntry: async (
    entryId: string,
    payload: UpdateEntryPayload,
  ): Promise<TimeEntry> => {
    const res = await api.patch(`/time-entries/${entryId}`, payload);
    return res.data.data;
  },

  deleteAllEntries: async (): Promise<void> => {
    await api.delete("/time-entries");
  },

  deleteEntriesByUser: async (userId: string): Promise<void> => {
    await api.delete(`/time-entries/user/${userId}`);
  },

  deleteEntriesByCustomer: async (customerId: string): Promise<void> => {
    await api.delete(`/time-entries/customer/${customerId}`);
  },

  deleteEntry: async (entryId: string): Promise<void> => {
    await api.delete(`/time-entries/${entryId}`);
  },
};

/** Flatten grouped entries into a plain array for calendar display. */
export const flattenGroupedEntries = (
  grouped: GroupedByCustomer[],
): TimeEntry[] => grouped.flatMap((g) => g.entries);

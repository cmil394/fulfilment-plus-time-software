import api from "./api";

export type EmployeeTaskSummary = {
  taskId: string;
  taskName: string;
  seconds: number;
};
export type EmployeeCustomerSummary = {
  customerId: string;
  customerName: string;
  totalSeconds: number;
  tasks: EmployeeTaskSummary[];
};
export type EmployeeReportSummary = {
  employeeName: string;
  totalSeconds: number;
  customers: EmployeeCustomerSummary[];
  start: string;
  end: string;
};

const summaryCache = new Map<
  string,
  { data: EmployeeReportSummary; expiresAt: number }
>();
const SUMMARY_CACHE_TTL_MS = 120_000;

export const reportService = {
  getEmployeeReportSummary: async (
    startDate?: string,
    endDate?: string,
  ): Promise<EmployeeReportSummary> => {
    const cacheKey = `${startDate ?? ""}|${endDate ?? ""}`;
    const cached = summaryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return cached.data;

    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await api.get(`/reports/employee/me/summary${query}`);
    const data = response.data as EmployeeReportSummary;
    summaryCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + SUMMARY_CACHE_TTL_MS,
    });
    return data;
  },

  invalidateSummaryCache: () => summaryCache.clear(),

  downloadEmployeeReport: async (
    startDate?: string,
    endDate?: string,
  ): Promise<{ blob: Blob; filename: string }> => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await api.get(`/reports/employee/me${query}`, {
      responseType: "blob",
    });
    const disposition = response.headers["content-disposition"] as
      | string
      | undefined;
    const match = disposition?.match(/filename="(.+?)"/);
    const filename = match?.[1] ?? "employee_hours_report.xlsx";
    return { blob: response.data as Blob, filename };
  },

  downloadEmployeeReportAsAdmin: async (
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ blob: Blob; filename: string }> => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await api.get(`/reports/employee/${userId}${query}`, {
      responseType: "blob",
    });
    const disposition = response.headers["content-disposition"] as
      | string
      | undefined;
    const match = disposition?.match(/filename="(.+?)"/);
    const filename = match?.[1] ?? `employee_${userId}_hours_report.xlsx`;
    return { blob: response.data as Blob, filename };
  },

  downloadCustomerReport: async (
    customerId: string,
    startDate: string,
    endDate: string,
  ): Promise<{ blob: Blob; filename: string }> => {
    const response = await api.get(
      `/reports/customer/${customerId}?startDate=${startDate}&endDate=${endDate}`,
      { responseType: "blob" },
    );
    const disposition = response.headers["content-disposition"] as
      | string
      | undefined;
    const match = disposition?.match(/filename="(.+?)"/);
    const filename = match?.[1] ?? `report_${customerId}.xlsx`;
    return { blob: response.data as Blob, filename };
  },
};

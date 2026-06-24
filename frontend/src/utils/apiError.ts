interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
      errors?: { message: string }[];
    };
  };
}

export function extractApiError(err: unknown, fallback: string): string {
  const data = (err as ApiErrorResponse)?.response?.data;
  if (data?.errors?.length) return data.errors.map((e) => e.message).join(", ");
  return data?.message ?? fallback;
}

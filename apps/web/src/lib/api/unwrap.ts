export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function extractMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('message' in error)) {
    return undefined;
  }

  const { message } = error;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  return typeof message === 'string' ? message : undefined;
}

export async function unwrap<T>(
  request: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await request;
  if (error !== undefined || data === undefined) {
    throw new ApiError(
      response.status,
      extractMessage(error) ?? response.statusText,
    );
  }
  return data;
}

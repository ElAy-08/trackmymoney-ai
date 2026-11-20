export type AuthFieldName = 'email' | 'name' | 'password';

export function mapValidationErrors<Field extends AuthFieldName>(
  payload: unknown,
  fields: readonly Field[],
  setFieldError: (field: Field, message: string) => void,
): number {
  if (typeof payload !== 'object' || payload === null || !('message' in payload)) {
    return 0;
  }

  const rawMessages = payload.message;
  const messages =
    typeof rawMessages === 'string'
      ? [rawMessages]
      : Array.isArray(rawMessages)
        ? rawMessages.filter((message): message is string => typeof message === 'string')
        : [];
  let mappedErrors = 0;

  for (const message of messages) {
    const normalizedMessage = message.toLowerCase();
    const field = fields.find(
      (candidate) =>
        normalizedMessage.startsWith(`${candidate} `) ||
        normalizedMessage.startsWith(`property ${candidate} `),
    );
    if (field) {
      setFieldError(field, message);
      mappedErrors += 1;
    }
  }

  return mappedErrors;
}


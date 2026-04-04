export class ClientError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'ClientError';
  }
}

export const isClientError = (error: unknown): error is ClientError =>
  error instanceof ClientError;

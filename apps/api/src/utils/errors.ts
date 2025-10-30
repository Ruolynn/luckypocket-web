export enum ErrorCode {
  VALIDATION_ERROR = '1000',
  UNAUTHORIZED = '1001',
  NOT_FOUND = '1003',
  RATE_LIMIT_EXCEEDED = '1004',

  PACKET_NOT_FOUND = '2001',
  PACKET_EXPIRED = '2002',
  PACKET_ALREADY_CLAIMED = '2003',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}



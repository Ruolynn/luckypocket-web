/**
 * @file Error Handling
 * @description Global error handling utilities
 */

import { toast } from 'sonner'

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class ContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContractError'
  }
}

export function handleError(error: unknown) {
  console.error('Error:', error)

  if (error instanceof APIError) {
    toast.error(`API Error: ${error.message}`)
  } else if (error instanceof ContractError) {
    toast.error(`Contract Error: ${error.message}`)
  } else if (error instanceof Error) {
    toast.error(error.message)
  } else {
    toast.error('An unknown error occurred')
  }
}

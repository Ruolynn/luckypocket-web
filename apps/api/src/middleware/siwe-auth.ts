/**
 * @file SIWE Authentication Middleware
 * @description JWT authentication middleware for protecting routes
 */

import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'
import { jwtService } from '../services/jwt.service'
import type { JWTPayload } from '../types/auth.types'

// Extend FastifyRequest to include user property
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload
  }
}

/**
 * Extract JWT token from Authorization header
 * @param request - Fastify request object
 * @returns JWT token string or null
 */
function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization

  if (!authHeader) {
    return null
  }

  // Support both "Bearer <token>" and "<token>" formats
  const parts = authHeader.split(' ')
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1]
  }

  if (parts.length === 1) {
    return parts[0]
  }

  return null
}

/**
 * SIWE authentication middleware
 * Verifies JWT token and injects user info into request
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 * @param done - Callback function
 */
export async function siweAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  try {
    // Extract token from Authorization header
    const token = extractToken(request)

    if (!token) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Missing authentication token'
      })
    }

    // Verify and decode token
    try {
      const payload = jwtService.verifyToken(token)

      // Inject user info into request
      request.user = payload

      done()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

      if (errorMessage === 'TOKEN_EXPIRED') {
        return reply.code(401).send({
          error: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        })
      }

      if (errorMessage === 'INVALID_TOKEN') {
        return reply.code(401).send({
          error: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        })
      }

      return reply.code(401).send({
        error: 'AUTHENTICATION_FAILED',
        message: 'Token verification failed'
      })
    }
  } catch (error) {
    return reply.code(500).send({
      error: 'INTERNAL_ERROR',
      message: 'Authentication middleware error'
    })
  }
}

/**
 * Optional authentication middleware
 * Same as siweAuthMiddleware but doesn't reject unauthenticated requests
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 * @param done - Callback function
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  try {
    const token = extractToken(request)

    if (!token) {
      // No token provided, continue without authentication
      done()
      return
    }

    try {
      const payload = jwtService.verifyToken(token)
      request.user = payload
    } catch {
      // Invalid token, but don't reject the request
      // Just don't set request.user
    }

    done()
  } catch {
    done()
  }
}

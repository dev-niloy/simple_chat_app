import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
}

/**
 * Socket.io authentication middleware
 * Validates JWT token and attaches userId to socket
 */
export function socketAuthMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): void {
  try {
    // Token can come from query string or handshake headers
    const token =
      socket.handshake.query.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.jwt.access_secret) as {
      sub?: string;
      userId?: string;
    };

    const userId = decoded.sub || decoded.userId;
    if (!userId) {
      return next(new Error('Authentication error: Invalid token payload'));
    }

    socket.userId = userId;
    next();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Authentication failed';
    next(new Error(`Authentication error: ${message}`));
  }
}

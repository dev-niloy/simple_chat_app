import { Server as HTTPServer } from 'http';
import { Server, ServerOptions } from 'socket.io';
import { config } from '../config/config';
import { socketAuthMiddleware } from './socketAuth';
import { setupEventHandlers } from './eventHandlers';

let io: Server | null = null;

/**
 * Initialize Socket.io server and attach to HTTP server
 */
export function initializeSocketServer(httpServer: HTTPServer): Server {
  const socketOptions: Partial<ServerOptions> = {
    cors: {
      origin: config.cors_origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  };

  io = new Server(httpServer, socketOptions);

  // Register authentication middleware
  io.use(socketAuthMiddleware);

  // Setup all event handlers
  setupEventHandlers(io);

  return io;
}

/**
 * Get the Socket.io server instance
 */
export function getSocketServer(): Server {
  if (!io) {
    throw new Error('Socket.io server not initialized. Call initializeSocketServer first.');
  }
  return io;
}

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
  console.log('Socket.io server initialized with CORS origin:', config.cors_origin);

  // Register authentication middleware
  io.use(socketAuthMiddleware);

  // Setup all event handlers
  try {
    setupEventHandlers(io);
    console.log('Socket.io event handlers registered');
  } catch (error) {
    console.error('Failed to setup Socket.io event handlers:', error);
    throw error;
  }

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

/**
 * Gracefully close Socket.io server and clean up connections
 */
export function closeSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    if (io) {
      console.log('Closing Socket.io server...');
      io.close();
      io = null;
      resolve();
    } else {
      resolve();
    }
  });
}

import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { SOCKET_EVENTS } from './events';
import {
  roomManager,
  generateChatRoomName,
} from './roomManager';
import { AuthenticatedSocket } from './socketAuth';

export function setupEventHandlers(io: Server): void {
  io.on('connect', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;

    if (!userId) {
      socket.emit(SOCKET_EVENTS.AUTH_ERROR, 'User ID not found');
      socket.disconnect();
      return;
    }

    // Register user as online
    roomManager.userConnected(userId, socket.id);

    // Broadcast user online to all connected clients
    io.emit(SOCKET_EVENTS.USER_ONLINE, {
      userId,
      timestamp: Date.now(),
    });

    // ============ USER STATUS EVENTS ============

    socket.on(SOCKET_EVENTS.GET_ONLINE_USERS, () => {
      const onlineUsers = roomManager.getOnlineUsers();
      socket.emit(SOCKET_EVENTS.ONLINE_USERS_LIST, {
        users: onlineUsers,
        timestamp: Date.now(),
      });
    });

    // ============ MESSAGING EVENTS ============

    socket.on(
      SOCKET_EVENTS.SEND_MESSAGE,
      (
        payload: { recipientId: string; text: string; timestamp: number },
        callback?: (response: any) => void
      ) => {
        try {
          const { recipientId, text, timestamp } = payload;

          // Validate input
          if (!recipientId || !text || typeof text !== 'string') {
            const error = 'Invalid message: recipientId and text are required';
            socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, error);
            callback?.({ status: 'error', message: error });
            return;
          }

          if (text.trim().length === 0) {
            const error = 'Message text cannot be empty';
            socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, error);
            callback?.({ status: 'error', message: error });
            return;
          }

          const MAX_MESSAGE_LENGTH = 4096;
          if (text.length > MAX_MESSAGE_LENGTH) {
            const error = `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`;
            socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, error);
            callback?.({ status: 'error', message: error });
            return;
          }

          // Check if recipient is online
          const recipientSocketId = roomManager.isUserOnline(recipientId);
          if (!recipientSocketId) {
            const error = 'Recipient is offline or not found';
            socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, error);
            callback?.({ status: 'error', message: error });
            return;
          }

          // Generate message ID
          const messageId = randomUUID();

          // Generate chat room name
          const roomName = generateChatRoomName(userId, recipientId);

          // Join both users to the room
          socket.join(roomName);
          io.to(recipientSocketId).socketsJoin(roomName);

          // Validate and sanitize timestamp
          const now = Date.now();
          const maxSkew = 60000; // 1 minute
          const sanitizedTimestamp =
            timestamp && typeof timestamp === 'number' && Math.abs(timestamp - now) < maxSkew
              ? timestamp
              : now;

          // Send message to recipient
          io.to(roomName).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, {
            messageId,
            senderId: userId,
            text,
            timestamp: sanitizedTimestamp,
          });

          // Acknowledge to sender
          callback?.({
            status: 'sent',
            messageId,
            sentAt: Date.now(),
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to send message';
          socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, message);
          callback?.({ status: 'error', message });
        }
      }
    );

    // ============ READ RECEIPT EVENTS ============

    socket.on(
      SOCKET_EVENTS.MESSAGE_READ,
      (payload: { messageId: string; senderId: string }) => {
        try {
          const { messageId, senderId } = payload;

          if (!messageId || !senderId) {
            socket.emit(SOCKET_EVENTS.ERROR, 'messageId and senderId are required');
            return;
          }

          // Only send read receipt to the message sender
          const senderSocketId = roomManager.isUserOnline(senderId);
          if (senderSocketId) {
            io.to(senderSocketId).emit(SOCKET_EVENTS.READ_RECEIPT, {
              messageId,
              readBy: userId,
              readAt: Date.now(),
            });
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to send read receipt';
          socket.emit(SOCKET_EVENTS.ERROR, message);
        }
      }
    );

    // ============ TYPING INDICATOR EVENTS ============

    socket.on(
      SOCKET_EVENTS.USER_TYPING,
      (payload: { recipientId: string }) => {
        try {
          const { recipientId } = payload;

          if (!recipientId) {
            return;
          }

          const recipientSocketId = roomManager.isUserOnline(recipientId);
          if (!recipientSocketId) {
            return; // Recipient not online, silently ignore
          }

          // Send typing indicator only to recipient
          io.to(recipientSocketId).emit(SOCKET_EVENTS.RECIPIENT_TYPING, {
            senderId: userId,
          });
        } catch (error) {
          // Silently ignore typing errors
        }
      }
    );

    socket.on(
      SOCKET_EVENTS.USER_STOPPED_TYPING,
      (payload: { recipientId: string }) => {
        try {
          const { recipientId } = payload;

          if (!recipientId) {
            return;
          }

          const recipientSocketId = roomManager.isUserOnline(recipientId);
          if (!recipientSocketId) {
            return;
          }

          // Send stopped typing indicator only to recipient
          io.to(recipientSocketId).emit(SOCKET_EVENTS.RECIPIENT_STOPPED_TYPING, {
            senderId: userId,
          });
        } catch (error) {
          // Silently ignore typing errors
        }
      }
    );

    // ============ DISCONNECTION ============

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      const disconnectedUserId = roomManager.userDisconnected(socket.id);

      if (disconnectedUserId) {
        // Broadcast user offline to all clients
        io.emit(SOCKET_EVENTS.USER_OFFLINE, {
          userId: disconnectedUserId,
          timestamp: Date.now(),
        });
      }
    });
  });
}

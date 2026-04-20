// In-memory tracking of connected users and their sockets
export class RoomManager {
  // Map of userId → socketId
  private onlineUsers: Map<string, string> = new Map();

  // Map of socketId → userId
  private socketToUser: Map<string, string> = new Map();

  /**
   * Register a user as online
   */
  userConnected(userId: string, socketId: string): void {
    this.onlineUsers.set(userId, socketId);
    this.socketToUser.set(socketId, userId);
  }

  /**
   * Remove a user from online tracking
   */
  userDisconnected(socketId: string): string | undefined {
    const userId = this.socketToUser.get(socketId);
    if (userId) {
      this.onlineUsers.delete(userId);
      this.socketToUser.delete(socketId);
    }
    return userId;
  }

  /**
   * Check if a user is online and get their socketId
   */
  isUserOnline(userId: string): string | undefined {
    return this.onlineUsers.get(userId);
  }

  /**
   * Get all online user IDs
   */
  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  /**
   * Get userId from socketId
   */
  getUserId(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }
}

// Singleton instance
export const roomManager = new RoomManager();

/**
 * Generate consistent room name for 1-on-1 chat
 * Rooms are lexicographically sorted to ensure same room for both users
 */
export function generateChatRoomName(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `chat_${sorted[0]}_${sorted[1]}`;
}

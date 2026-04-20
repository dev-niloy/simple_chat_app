// Connection events (built-in, but we reference them)
export const SOCKET_EVENTS = {
  // Connection lifecycle
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // User status
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  GET_ONLINE_USERS: 'get_online_users',
  ONLINE_USERS_LIST: 'online_users_list',

  // Messaging
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_ERROR: 'message_error',

  // Read receipts
  MESSAGE_READ: 'message_read',
  READ_RECEIPT: 'read_receipt',

  // Typing indicators
  USER_TYPING: 'user_typing',
  RECIPIENT_TYPING: 'recipient_typing',
  USER_STOPPED_TYPING: 'user_stopped_typing',
  RECIPIENT_STOPPED_TYPING: 'recipient_stopped_typing',

  // Errors
  ERROR: 'error',
  AUTH_ERROR: 'auth_error',
} as const;

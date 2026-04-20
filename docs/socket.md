# Socket.io Client Integration Guide

This guide provides comprehensive instructions for integrating Socket.io real-time messaging with JWT authentication into your client applications.

## Table of Contents

1. [Installation](#installation)
2. [Connection with JWT Authentication](#connection-with-jwt-authentication)
3. [Event Reference](#event-reference)
4. [Error Handling](#error-handling)
5. [Example React Component](#example-react-component)
6. [Testing Locally](#testing-locally)

---

## Installation

### Prerequisites

- Node.js 14+ or browser with WebSocket support
- Valid JWT token with `id`, `sub`, or `userId` claim
- Server running on the configured Socket.io endpoint

### npm Installation

```bash
npm install socket.io-client
```

### Browser Installation

```html
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
```

---

## Connection with JWT Authentication

### Basic Connection

```javascript
import io from 'socket.io-client';

const token = localStorage.getItem('authToken'); // Your JWT token
const socket = io('http://localhost:5000', {
  auth: {
    token: token
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling']
});

// Listen for connection
socket.on('connect', () => {
  console.log('Connected to server');
});

// Handle authentication errors
socket.on('auth_error', (error) => {
  console.error('Authentication error:', error);
  // Redirect to login or refresh token
});

// Handle general errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Handle disconnection
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

### Authentication Methods

The server accepts JWT tokens in two ways:

**Method 1: Query Parameter**
```javascript
const socket = io('http://localhost:5000', {
  query: {
    token: 'your-jwt-token'
  }
});
```

**Method 2: Authorization Header**
```javascript
const socket = io('http://localhost:5000', {
  extraHeaders: {
    Authorization: `Bearer your-jwt-token`
  }
});
```

### JWT Token Requirements

Your JWT token must contain one of these claims:
- `id` (primary identifier)
- `sub` (alternative identifier)
- `userId` (fallback identifier)

Example JWT payload:
```json
{
  "id": "user-uuid-123",
  "email": "user@example.com",
  "role": "user",
  "iat": 1640000000,
  "exp": 1640086400
}
```

---

## Event Reference

### User Status Events

#### Get Online Users
**Client → Server**
```javascript
socket.emit('get_online_users');
```

**Server → Client Response**
```javascript
socket.on('online_users_list', (data) => {
  const { users, timestamp } = data;
  // users: string[] - Array of online user IDs
  // timestamp: number - Server timestamp
  console.log('Online users:', users);
});
```

#### User Online Notification
**Server → Client (Broadcast)**
```javascript
socket.on('user_online', (data) => {
  const { userId, timestamp } = data;
  console.log(`${userId} came online`);
});
```

#### User Offline Notification
**Server → Client (Broadcast)**
```javascript
socket.on('user_offline', (data) => {
  const { userId, timestamp } = data;
  console.log(`${userId} went offline`);
});
```

---

### Messaging Events

#### Send Message
**Client → Server**
```javascript
socket.emit('send_message', 
  {
    recipientId: 'recipient-user-id',
    text: 'Hello, how are you?',
    timestamp: Date.now()
  },
  (response) => {
    if (response.status === 'sent') {
      console.log('Message sent:', response.messageId);
    } else {
      console.error('Failed to send:', response.message);
    }
  }
);
```

**Server → Client (Acknowledgment Callback)**
```javascript
{
  status: 'sent' | 'error',
  messageId: string,      // UUID of the message
  sentAt: number,         // Timestamp when sent
  message?: string        // Error message if status === 'error'
}
```

**Validation Rules:**
- `recipientId`: Required, must be valid user ID
- `text`: Required, non-empty string
- `text` length: Maximum 4096 characters
- `timestamp`: Optional, validated within ±60 seconds of server time
- Recipient must be online to receive message

#### Receive Message
**Server → Client (Room Broadcast)**
```javascript
socket.on('receive_message', (data) => {
  const { messageId, senderId, text, timestamp } = data;
  console.log(`Message from ${senderId}: ${text}`);
});
```

#### Message Error
**Server → Client**
```javascript
socket.on('message_error', (error) => {
  console.error('Message error:', error);
  // Possible errors:
  // - "Invalid message: recipientId and text are required"
  // - "Message text cannot be empty"
  // - "Message exceeds maximum length of 4096 characters"
  // - "Recipient is offline or not found"
});
```

---

### Read Receipt Events

#### Send Read Receipt
**Client → Server**
```javascript
socket.emit('message_read', {
  messageId: 'message-uuid-123',
  senderId: 'original-sender-id'
});
```

**Requirements:**
- `messageId`: UUID of the message being read
- `senderId`: ID of the message's original sender

#### Receive Read Receipt
**Server → Client (Sent Only to Original Sender)**
```javascript
socket.on('read_receipt', (data) => {
  const { messageId, readBy, readAt } = data;
  console.log(`Message ${messageId} read by ${readBy} at ${readAt}`);
});
```

**Important:** Read receipts are only sent to the original message sender, not broadcast to other users.

---

### Typing Indicator Events

#### User Started Typing
**Client → Server**
```javascript
socket.emit('user_typing', {
  recipientId: 'recipient-user-id'
});
```

**Best Practice:** Emit this event when user starts typing and has been idle for ~100ms.

#### Recipient Typing Notification
**Server → Client (Sent to Recipient Only)**
```javascript
socket.on('recipient_typing', (data) => {
  const { senderId } = data;
  console.log(`${senderId} is typing...`);
});
```

#### User Stopped Typing
**Client → Server**
```javascript
socket.emit('user_stopped_typing', {
  recipientId: 'recipient-user-id'
});
```

**Best Practice:** Emit this event after a timeout (e.g., 1 second of inactivity) or when user sends a message.

#### Recipient Stopped Typing Notification
**Server → Client (Sent to Recipient Only)**
```javascript
socket.on('recipient_stopped_typing', (data) => {
  const { senderId } = data;
  console.log(`${senderId} stopped typing`);
});
```

---

### Built-in Events

#### Connection
```javascript
socket.on('connect', () => {
  console.log('Socket connected, id:', socket.id);
});
```

#### Disconnection
```javascript
socket.on('disconnect', (reason) => {
  // reason can be: "io server disconnect", "io client namespace disconnect",
  // "ping response timeout", "transport close", "transport error", etc.
  console.log('Disconnected:', reason);
});
```

---

## Error Handling

### Comprehensive Error Handling Example

```javascript
const socket = io('http://localhost:5000', {
  auth: { token: jwtToken },
  reconnection: true
});

// Authentication errors
socket.on('auth_error', (error) => {
  console.error('Auth failed:', error);
  // Token expired or invalid - refresh or redirect to login
  window.location.href = '/login';
});

// General socket errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Message-specific errors
socket.on('message_error', (error) => {
  console.error('Message error:', error);
  showErrorToUser(error);
});

// Automatic reconnection events
socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`Reconnecting attempt ${attemptNumber}`);
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect after max attempts');
  // Handle permanent connection failure
});

socket.on('reconnect', () => {
  console.log('Reconnected to server');
  // Refresh state after reconnection
  socket.emit('get_online_users');
});
```

### Common Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| "Authentication error: No token provided" | Missing or invalid token | Ensure token is in auth or headers |
| "Authentication error: Invalid token payload" | Token missing required claim | Token must have `id`, `sub`, or `userId` |
| "Recipient is offline or not found" | Recipient not connected | Show user offline message |
| "Message exceeds maximum length" | Message > 4096 characters | Truncate or warn user |
| "io server disconnect" | Server disconnected client | Automatic reconnection will attempt |
| "transport close" | Network connection lost | Automatic reconnection will attempt |

---

## Example React Component

### Full Chat Component with All Features

```typescript
import React, { useEffect, useState, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

interface Message {
  messageId: string;
  senderId: string;
  text: string;
  timestamp: number;
  readAt?: number;
}

interface ChatComponentProps {
  currentUserId: string;
  recipientId: string;
  jwtToken: string;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({
  currentUserId,
  recipientId,
  jwtToken,
}) => {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize socket connection
  useEffect(() => {
    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: { token: jwtToken },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      socket.emit('get_online_users');
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      setIsConnected(false);
    });

    // Authentication
    socket.on('auth_error', (error) => {
      console.error('Auth error:', error);
      // Redirect to login
      window.location.href = '/login';
    });

    // User status
    socket.on('user_online', (data) => {
      const { userId } = data;
      setOnlineUsers((prev) => {
        if (!prev.includes(userId)) {
          return [...prev, userId];
        }
        return prev;
      });
    });

    socket.on('user_offline', (data) => {
      const { userId } = data;
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    socket.on('online_users_list', (data) => {
      const { users } = data;
      setOnlineUsers(users);
    });

    // Messaging
    socket.on('receive_message', (data: Message) => {
      setMessages((prev) => [...prev, data]);
      // Automatically send read receipt
      socket.emit('message_read', {
        messageId: data.messageId,
        senderId: data.senderId,
      });
    });

    socket.on('message_error', (error) => {
      console.error('Message error:', error);
      alert(`Failed to send message: ${error}`);
    });

    // Read receipts
    socket.on('read_receipt', (data) => {
      const { messageId, readAt } = data;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.messageId === messageId ? { ...msg, readAt } : msg
        )
      );
    });

    // Typing indicators
    socket.on('recipient_typing', () => {
      setRecipientTyping(true);
    });

    socket.on('recipient_stopped_typing', () => {
      setRecipientTyping(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [jwtToken]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      socketRef.current?.emit('user_typing', { recipientId });
    }

    // Debounce typing stop
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socketRef.current?.emit('user_stopped_typing', { recipientId });
      }
    }, 1000);
  };

  // Send message
  const handleSendMessage = useCallback(() => {
    if (!inputText.trim() || !socketRef.current) {
      return;
    }

    socketRef.current.emit(
      'send_message',
      {
        recipientId,
        text: inputText.trim(),
        timestamp: Date.now(),
      },
      (response: any) => {
        if (response.status === 'sent') {
          setInputText('');
          setIsTyping(false);
          socketRef.current?.emit('user_stopped_typing', { recipientId });
          // Add message to local state
          setMessages((prev) => [
            ...prev,
            {
              messageId: response.messageId,
              senderId: currentUserId,
              text: inputText.trim(),
              timestamp: response.sentAt,
            },
          ]);
        } else {
          console.error('Failed to send message:', response.message);
          alert(`Failed to send message: ${response.message}`);
        }
      }
    );
  }, [inputText, recipientId, currentUserId]);

  const isRecipientOnline = onlineUsers.includes(recipientId);

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Chat with {recipientId}</h2>
        <span className={`status ${isRecipientOnline ? 'online' : 'offline'}`}>
          {isRecipientOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="messages-container">
        {messages.map((msg) => (
          <div
            key={msg.messageId}
            className={`message ${msg.senderId === currentUserId ? 'sent' : 'received'}`}
          >
            <div className="message-content">
              <p>{msg.text}</p>
              <span className="timestamp">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
              {msg.readAt && msg.senderId === currentUserId && (
                <span className="read-indicator">✓✓ Read</span>
              )}
            </div>
          </div>
        ))}
        {recipientTyping && (
          <div className="message typing-indicator">
            <span>typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={handleInputChange}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
          disabled={!isConnected || !isRecipientOnline}
        />
        <button onClick={handleSendMessage} disabled={!inputText.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatComponent;
```

### Basic Component (Minimal)

```typescript
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const SimpleChat: React.FC<{ token: string }> = ({ token }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const socket = io('http://localhost:5000', { auth: { token } });

    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => socket.disconnect();
  }, [token]);

  const sendMessage = (recipientId: string) => {
    // In production, get socket from context or ref
    // socket.emit('send_message', { recipientId, text: input });
    setInput('');
  };

  return (
    <div>
      <div>
        {messages.map((msg) => (
          <div key={msg.messageId}>{msg.text}</div>
        ))}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={() => sendMessage('recipient-id')}>Send</button>
    </div>
  );
};
```

---

## Testing Locally

### Prerequisites

1. Ensure backend server is running:
   ```bash
   npm run dev
   ```

2. You should see:
   ```
   Database connected successfully
   Server running on port 5000
   Socket.io server initialized
   ```

### Test Client Setup

#### Using curl (Test connection without client library)

```bash
# Test HTTP endpoint (if available)
curl http://localhost:5000/health
```

#### Using Node.js Test Script

Create `test-socket.js`:

```javascript
const io = require('socket.io-client');

const token = 'your-jwt-token-here'; // Use a valid JWT token
const socket = io('http://localhost:5000', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('✓ Connected to server');
  
  // Test getting online users
  socket.emit('get_online_users');
});

socket.on('online_users_list', (data) => {
  console.log('✓ Received online users:', data.users);
});

socket.on('error', (error) => {
  console.error('✗ Error:', error);
});

socket.on('auth_error', (error) => {
  console.error('✗ Auth error:', error);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
  process.exit(0);
});

// Auto-disconnect after 5 seconds
setTimeout(() => {
  socket.disconnect();
}, 5000);
```

Run test:
```bash
node test-socket.js
```

#### Using the Example React Component

1. Install dependencies:
   ```bash
   npm install socket.io-client
   ```

2. Create environment variable:
   ```
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

3. Integrate ChatComponent into your React app:
   ```tsx
   <ChatComponent
     currentUserId="user-123"
     recipientId="user-456"
     jwtToken={authToken}
   />
   ```

4. Open multiple browser windows/tabs to test real-time features

### Verification Checklist

- [ ] Server starts without errors
- [ ] Socket.io initializes with correct CORS settings
- [ ] Client can connect with valid JWT
- [ ] Authentication error shown for invalid/missing token
- [ ] Online users list updates in real-time
- [ ] User online/offline events broadcast correctly
- [ ] Messages sent and received in 1:1 chat room
- [ ] Message acknowledgments return correct response
- [ ] Read receipts sent only to original sender
- [ ] Typing indicators appear/disappear correctly
- [ ] Error messages display for invalid messages
- [ ] Reconnection works after network interruption
- [ ] Client disconnects cleanly on logout

### Browser DevTools Testing

1. Open browser console in two windows
2. Connect both to server with different user IDs
3. Send message from one window:
   ```javascript
   socket.emit('send_message', {
     recipientId: 'user-456',
     text: 'Test message',
     timestamp: Date.now()
   }, (response) => console.log(response));
   ```
4. Verify receive_message event in other window:
   ```javascript
   socket.on('receive_message', (data) => console.log(data));
   ```

---

## Troubleshooting

### Connection Issues

**Problem:** Cannot connect to server
```
Error: Failed to connect
```

**Solutions:**
- Verify server is running on correct port
- Check CORS origin matches client URL
- Ensure firewall allows WebSocket connections
- Try different transports: `['websocket', 'polling']`

### Authentication Issues

**Problem:** Getting auth_error
```
Authentication error: Invalid token payload
```

**Solutions:**
- Verify JWT token is valid and not expired
- Check token contains `id`, `sub`, or `userId` claim
- Ensure token is passed correctly in auth or headers
- Decode JWT to verify payload: https://jwt.io

### Message Not Sending

**Problem:** Message sends but not received
```
Recipient is offline or not found
```

**Solutions:**
- Verify recipient is connected to server
- Check recipient user ID is exactly correct
- Ensure both users are in same Socket.io namespace
- Check message length < 4096 characters

### Performance Issues

**Problem:** High latency or dropped messages
```
Many reconnect attempts in logs
```

**Solutions:**
- Check network connection quality
- Reduce message frequency
- Increase reconnection timeouts
- Monitor server resource usage
- Check Socket.io logs on server side

---

## Best Practices

1. **Always handle authentication errors** - Redirect to login on auth failure
2. **Implement exponential backoff** for reconnection attempts
3. **Validate input** on client before emitting events
4. **Send read receipts** automatically when receiving messages
5. **Debounce typing indicators** to avoid flooding socket with events
6. **Store JWT token securely** (httpOnly cookies recommended)
7. **Monitor connection state** and update UI accordingly
8. **Gracefully handle offline mode** - queue messages when offline
9. **Clean up event listeners** on component unmount
10. **Test with network throttling** in DevTools to catch edge cases

---

## API Reference Summary

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `connect` | Server → Client | None | Socket connected |
| `disconnect` | Server → Client | reason | Socket disconnected |
| `auth_error` | Server → Client | string | Authentication failed |
| `error` | Server → Client | string | General error |
| `user_online` | Server → Client | {userId, timestamp} | User came online |
| `user_offline` | Server → Client | {userId, timestamp} | User went offline |
| `get_online_users` | Client → Server | None | Request online users |
| `online_users_list` | Server → Client | {users[], timestamp} | List of online users |
| `send_message` | Client → Server | {recipientId, text, timestamp} | Send message |
| `receive_message` | Server → Client | {messageId, senderId, text, timestamp} | Receive message |
| `message_error` | Server → Client | string | Message error |
| `message_read` | Client → Server | {messageId, senderId} | Mark message as read |
| `read_receipt` | Server → Client | {messageId, readBy, readAt} | Message read receipt |
| `user_typing` | Client → Server | {recipientId} | User started typing |
| `recipient_typing` | Server → Client | {senderId} | Recipient typing |
| `user_stopped_typing` | Client → Server | {recipientId} | User stopped typing |
| `recipient_stopped_typing` | Server → Client | {senderId} | Recipient stopped typing |

---

## Support & Resources

- Socket.io Documentation: https://socket.io/docs/
- Socket.io Client Examples: https://socket.io/get-started/
- JWT Debugging: https://jwt.io
- WebSocket Best Practices: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- TypeScript Types for Socket.io: https://www.npmjs.com/package/@types/socket.io-client

---

**Last Updated:** April 20, 2026
**Socket.io Version:** 4.7.2
**Status:** Production Ready

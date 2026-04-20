# Simple Chat App - Express Backend

A real-time 1-on-1 chat application built with Express, TypeScript, Prisma, and Socket.io. Features JWT authentication, typing indicators, read receipts, and online status tracking.

## Features

- ✅ **User Authentication**: JWT-based auth with refresh tokens
- ✅ **Real-Time Messaging**: 1-on-1 chat with Socket.io
- ✅ **Typing Indicators**: See when users are typing
- ✅ **Read Receipts**: Confirm message delivery and reading
- ✅ **Online Status**: Track user availability
- ✅ **OTP Support**: Email-based OTP for verification
- ✅ **Role-Based Access**: ADMIN and USER roles
- ✅ **Security**: Password hashing, JWT validation, message size limits

## Tech Stack

- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Real-Time**: Socket.io
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Password**: bcrypt

## Prerequisites

- Node.js 16+
- PostgreSQL 12+
- npm or yarn
- Postman (optional, for API testing)

## Installation

### 1. Clone the Repository
```bash
git clone git@github.com:dev-niloy/simple_chat_app.git
cd simple_chat_app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Update `.env` with your values:
```env
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/simple_chat_db

# JWT
JWT_ACCESS_SECRET=your_secure_access_token_secret_key_here
JWT_REFRESH_SECRET=your_secure_refresh_token_secret_key_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# BCrypt
BCRYPT_SALT_ROUNDS=12

# Email (Gmail SMTP)
EMAIL_SENDER_HOST=smtp.gmail.com
EMAIL_SENDER_PORT=587
EMAIL_SENDER_USER=your@gmail.com
EMAIL_SENDER_PASS=your_app_password
EMAIL_SENDER_FROM="Chat App <your@gmail.com>"

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 4. Database Setup
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 5. Start the Server

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production mode** (after building):
```bash
npm run build
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication (`/api/auth`)

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "user-uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "user-uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "USER"
    }
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

### Users (`/api/users`)

#### Get All Users
```http
GET /api/users
Authorization: Bearer {accessToken}
```

#### Get User by ID
```http
GET /api/users/{userId}
Authorization: Bearer {accessToken}
```

#### Update User
```http
PUT /api/users/{userId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

#### Delete User
```http
DELETE /api/users/{userId}
Authorization: Bearer {accessToken}
```

## Socket.io Real-Time Chat

### Connection

Connect with JWT token:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  query: { token: accessToken },
  transports: ['websocket', 'polling']
});
```

### Events

#### User Status Events

**User comes online:**
```javascript
socket.on('user_online', (data) => {
  console.log(`${data.userId} is now online`);
  // { userId: "user-uuid", timestamp: 1713607200000 }
});
```

**User goes offline:**
```javascript
socket.on('user_offline', (data) => {
  console.log(`${data.userId} went offline`);
});
```

**Get online users:**
```javascript
socket.emit('get_online_users');

socket.on('online_users_list', (data) => {
  console.log('Online users:', data.users);
  // { users: ["user1", "user2"], timestamp: ... }
});
```

#### Messaging Events

**Send a message:**
```javascript
socket.emit(
  'send_message',
  {
    recipientId: 'recipient-user-id',
    text: 'Hello!',
    timestamp: Date.now()
  },
  (response) => {
    if (response.status === 'sent') {
      console.log('Message ID:', response.messageId);
    } else {
      console.error('Failed:', response.message);
    }
  }
);
```

**Receive a message:**
```javascript
socket.on('receive_message', (data) => {
  console.log(`Message from ${data.senderId}: ${data.text}`);
  // { messageId, senderId, text, timestamp }
  
  // Send read receipt
  socket.emit('message_read', { messageId: data.messageId, senderId: data.senderId });
});
```

#### Read Receipts

**Send read receipt:**
```javascript
socket.emit('message_read', { 
  messageId: 'msg-uuid',
  senderId: 'sender-user-id'
});
```

**Receive read receipt:**
```javascript
socket.on('read_receipt', (data) => {
  console.log(`Message ${data.messageId} read by ${data.readBy}`);
  // { messageId, readBy, readAt }
});
```

#### Typing Indicators

**User is typing:**
```javascript
socket.emit('user_typing', { recipientId: 'recipient-user-id' });
```

**Receive typing indicator:**
```javascript
socket.on('recipient_typing', (data) => {
  console.log(`${data.senderId} is typing...`);
});
```

**User stopped typing:**
```javascript
socket.emit('user_stopped_typing', { recipientId: 'recipient-user-id' });
```

**Receive stopped typing:**
```javascript
socket.on('recipient_stopped_typing', (data) => {
  console.log(`${data.senderId} stopped typing`);
});
```

#### Error Handling

```javascript
socket.on('message_error', (error) => {
  console.error('Message error:', error);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('auth_error', (error) => {
  console.error('Authentication error:', error);
});
```

## Project Structure

```
src/
├── app.ts                 # Express app configuration
├── server.ts              # Server entry point
├── app/
│   ├── modules/           # Feature modules
│   │   ├── Auth/          # Authentication
│   │   └── User/          # User management
│   ├── middlewares/       # Express middlewares
│   ├── routes/            # Route definitions
│   └── errors/            # Custom error classes
├── socket/                # Socket.io implementation
│   ├── socketHandler.ts   # Server initialization
│   ├── socketAuth.ts      # JWT authentication
│   ├── eventHandlers.ts   # Event listeners
│   ├── roomManager.ts     # Room and user tracking
│   └── events.ts          # Event constants
├── config/                # Configuration
├── helpers/               # Utility functions
├── shared/                # Shared services
└── constants/             # App constants
```

## Development Commands

```bash
# Start development server
npm run dev

# Build TypeScript
npm run build

# Run production server
npm start

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

## Testing with Postman

Import `postman_collection.json` into Postman to test all APIs and Socket.io events. See the collection for:
- Authentication flows
- User management endpoints
- Socket.io event examples
- Error cases

## Database Schema

### Users Table
- `id`: UUID (primary key)
- `name`: String
- `email`: String (unique)
- `password`: String (bcrypt hashed)
- `role`: ENUM (ADMIN, USER)
- `otp`: String (nullable)
- `otp_expires_at`: DateTime (nullable)
- `isDeleted`: Boolean
- `deletedAt`: DateTime (nullable)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### RefreshTokens Table
- `id`: UUID (primary key)
- `token`: String (unique)
- `userId`: UUID (foreign key)
- `expiresAt`: DateTime
- `createdAt`: DateTime

## Security Features

- ✅ JWT token validation on all protected routes
- ✅ Password hashing with bcrypt (12 salt rounds)
- ✅ Message size limit: 4096 characters
- ✅ Timestamp validation: ±60 seconds tolerance
- ✅ CORS configuration
- ✅ Rate limiting ready (express-rate-limit)
- ✅ Soft deletes for users
- ✅ Read receipts sent only to message sender (privacy)

## Error Handling

All errors follow a consistent format:
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Error description",
  "data": null
}
```

### Common Error Codes
- `400`: Bad Request (validation error)
- `401`: Unauthorized (invalid token)
- `403`: Forbidden (no permission)
- `404`: Not Found
- `500`: Internal Server Error

## Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost/db` |
| `JWT_ACCESS_SECRET` | Secret for access tokens | Random 32+ char string |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Random 32+ char string |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | `15m`, `1h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `BCRYPT_SALT_ROUNDS` | Password hashing strength | `12` (higher = slower) |
| `EMAIL_SENDER_*` | SMTP configuration | Gmail: `smtp.gmail.com:587` |
| `CORS_ORIGIN` | Frontend URL for CORS | `http://localhost:3000` |

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check `DATABASE_URL` is correct
- Run migrations: `npm run prisma:migrate`

### Socket.io Connection Failed
- Verify `CORS_ORIGIN` matches frontend URL
- Check JWT token is valid
- Ensure server is running on correct port

### Email Not Sending
- Enable "Less Secure App Access" for Gmail
- Use [App Passwords](https://myaccount.google.com/apppasswords) for Gmail
- Check SMTP credentials in `.env`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "feat: add your feature"`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check existing GitHub issues
2. Create a new issue with details
3. Include error logs and reproduction steps

## Author

**Niloy Roy** - dev-niloy  
Email: niloyroy184@gmail.com  
GitHub: [@dev-niloy](https://github.com/dev-niloy)

---

**Happy coding! 🚀**

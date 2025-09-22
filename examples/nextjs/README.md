# MockDash Next.js Authentication Example

This example demonstrates a modern authentication flow using MockDash with Next.js 15, featuring:

- **Email/Password Authentication** - Complete login and registration flow
- **JWT Token Management** - Secure token-based authentication
- **Protected Routes** - Route protection with automatic redirects
- **Profile Management** - User profile updates
- **Type-Safe API Client** - Fully typed API interactions
- **Mock Server** - Complete backend simulation

## Features

### Authentication Flow

- User registration with email, password, and name
- User login with email and password
- Automatic token management with cookies
- Logout functionality
- Protected route middleware

### User Interface

- Clean, responsive design with Tailwind CSS
- Loading states and error handling
- Form validation
- Avatar integration with DiceBear API

### API Integration

- Type-safe API client with MockDash
- Request/response interceptors for auth tokens
- Zod schema validation
- Mock server with realistic auth endpoints

## Getting Started

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Start the mock server:**

   ```bash
   pnpm mock
   ```

   The mock server will run on `http://localhost:3001`

3. **Start the development server:**
   ```bash
   pnpm dev
   ```
   The Next.js app will run on `http://localhost:3000`

## Project Structure

```
examples/nextjs/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx      # Login page
│   │   └── register/page.tsx   # Registration page
│   ├── profile/page.tsx        # User profile page
│   ├── layout.tsx              # Root layout with AuthProvider
│   └── page.tsx                # Home page with auth state
├── components/auth/
│   ├── login-form.tsx          # Login form component
│   ├── register-form.tsx       # Registration form component
│   └── protected-route.tsx     # Route protection wrapper
├── lib/
│   ├── api/
│   │   ├── schema.ts           # Zod API schemas
│   │   └── client.ts           # Type-safe API client
│   ├── auth/
│   │   └── context.tsx         # Auth context and hooks
│   └── mock-server.ts          # Mock authentication server
└── package.json
```

## Authentication Flow

### Registration

1. User fills out registration form (name, email, password)
2. Client sends request to `POST /api/auth/register`
3. Server validates input and creates user account
4. Server returns user data and JWT token
5. Client stores token in cookies and updates auth state

### Login

1. User enters email and password
2. Client sends request to `POST /api/auth/login`
3. Server validates credentials against stored users
4. Server returns user data and JWT token
5. Client stores token and redirects to dashboard

### Protected Routes

1. `ProtectedRoute` component checks auth state
2. If not authenticated, redirects to login page
3. If authenticated, renders protected content
4. Auth context provides user data throughout app

## API Endpoints

The mock server provides these authentication endpoints:

- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - Sign out user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/profile` - Update user profile
- `DELETE /api/profile` - Delete user account

## Key Technologies

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Utility-first styling
- **Zod** - Schema validation
- **MockDash** - API client and mock server generation
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT token management
- **js-cookie** - Cookie management

## Demo Credentials

Since this uses a mock server, you can register any user or use these test credentials:

- Email: `demo@example.com`
- Password: `password123`

The mock server stores users in memory, so data resets when the server restarts.

## Next Steps

- Replace mock server with real backend API
- Add password reset functionality
- Implement email verification
- Add social authentication providers
- Set up proper session management
- Add role-based access control

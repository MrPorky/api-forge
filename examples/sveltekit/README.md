# MockDash SvelteKit Example with Authentication

This example demonstrates a modern authentication flow using MockDash with SvelteKit and Svelte 5.

## Features

- 🔐 **Email/Password Authentication** - Complete login and registration flow
- 🎯 **Svelte 5 Runes** - Modern reactive state management with `$state`, `$derived`, and `$props`
- 🛡️ **Type-Safe API Client** - Fully typed API calls with automatic request/response validation
- 🎭 **Mock Server** - Realistic fake data generation for development
- 👤 **User Profile Management** - Edit profile information with real-time updates
- 🍪 **Persistent Sessions** - JWT token storage with automatic auth checking
- 📱 **Responsive Design** - Mobile-friendly UI components

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Start the development server:

```bash
pnpm dev
```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

## Authentication Flow

### Registration

- Navigate to `/auth` or click "Get Started"
- Fill out the registration form with name, email, and password
- Automatic login after successful registration
- JWT token stored in cookies for persistent sessions

### Login

- Use the login form on `/auth`
- Email and password validation
- Automatic redirect to dashboard on success

### Protected Routes

- `/dashboard` - Requires authentication
- Automatic redirect to `/auth` if not logged in
- Auth state persisted across browser sessions

### Profile Management

- View and edit user profile information
- Update name and avatar URL
- Real-time validation and error handling

## Project Structure

```
src/
├── lib/
│   ├── api/
│   │   ├── schema.ts          # Zod API schemas
│   │   └── client.ts          # Type-safe API client
│   ├── components/
│   │   ├── LoginForm.svelte   # Login form component
│   │   ├── RegisterForm.svelte # Registration form
│   │   └── UserProfile.svelte # Profile management
│   ├── stores/
│   │   └── auth.svelte.ts     # Auth state management (Svelte 5)
│   └── mock-server.ts         # Mock API server setup
├── routes/
│   ├── auth/
│   │   └── +page.svelte       # Authentication page
│   ├── dashboard/
│   │   └── +page.svelte       # User dashboard
│   ├── api/[...paths]/
│   │   └── +server.ts         # API route handler
│   ├── +layout.svelte         # App layout with navigation
│   └── +page.svelte           # Landing page
```

## API Endpoints

The mock server provides these authentication endpoints:

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/profile` - Update user profile
- `DELETE /api/profile` - Delete user account

## Svelte 5 Features Used

### Runes

- `$state()` - Reactive state management in the auth store
- `$derived()` - Computed values for form validation and UI state
- `$props()` - Component props with TypeScript support

### Modern Patterns

- Class-based stores for complex state management
- Reactive form validation
- Automatic cleanup and memory management

## Styling

The example uses vanilla CSS with:

- CSS Grid and Flexbox for layouts
- CSS custom properties for theming
- Responsive design patterns
- Modern UI components with hover states and transitions

## Development Notes

- The mock server generates realistic fake data using the `zocker` library
- JWT tokens are stored in cookies with 7-day expiration
- All API calls are fully type-safe with automatic validation
- Error handling includes network errors, validation errors, and API errors
- The auth state persists across browser refreshes and tabs

## Next Steps

To connect to a real backend:

1. Update the `baseURL` in `src/lib/api/client.ts`
2. Replace the mock server with your actual API endpoints
3. Ensure your backend follows the same schema contracts defined in `schema.ts`

The type-safe client will work seamlessly with any backend that implements the same API contract!

# Faerion

## Overview

Faerion is a license management and reseller administration dashboard built with React. It provides a dual-portal system where administrators can manage licenses, users, applications, and resellers, while resellers have their own portal to manage their allocated resources. The application communicates with a backend API through a Supabase Edge Function proxy.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Stack
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server (runs on port 4006)
- **React Router** for client-side routing with protected route guards
- **TanStack Query** for server state management and data fetching
- **Tailwind CSS** with CSS variables for theming (emerald/dark theme)
- **shadcn/ui** component library built on Radix UI primitives
- **Framer Motion** for animations

### Application Structure
- **Dual Portal System**: Separate admin (`/dashboard`, `/licenses`, etc.) and reseller (`/reseller/*`) routes
- **Protected Routes**: Authentication-based route guards checking user type (admin vs reseller)
- **Token-based Auth**: JWT tokens stored in localStorage with type discrimination

### API Communication
- All API calls route through a Supabase Edge Function proxy at `/functions/v1/faerion-proxy`
- The proxy forwards requests to an external Faerion API backend
- Auth tokens passed via `x-faerion-token` header
- Environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` configure the proxy connection

### Component Architecture
- **Layout Components**: `DashboardLayout` provides consistent page structure with sidebar navigation
- **Reusable Components**: `DataTable`, `StatsCard`, `Sidebar` shared across pages
- **UI Components**: Full shadcn/ui component set in `src/components/ui/`

### Key Features by Role
**Admin Portal:**
- License creation and management with bulk operations
- User management with ban/unban capabilities
- Application management with version control
- Reseller management with credit system
- Ticket support system
- System logs and variables

**Reseller Portal:**
- License viewing and HWID reset
- Transaction history
- Ticket creation
- Profile management

## External Dependencies

### Backend Services
- **Supabase**: Hosts the Edge Function proxy that forwards API requests
- **Faerion API**: External backend service handling all business logic (licenses, users, auth)

### Required Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase anon/public key for API access

### Key npm Dependencies
- `@supabase/supabase-js`: Supabase client (used for function invocation)
- `@tanstack/react-query`: Async state management
- `react-router-dom`: Client-side routing
- `framer-motion`: Animation library
- `lucide-react`: Icon library
- `date-fns`: Date formatting utilities
- Radix UI primitives: Accessible UI component foundations
# Chat without border - Multilingual Real-time Chat Application

## Overview

Chat without border is a real-time multilingual chat application that enables users to communicate seamlessly across language barriers. The application provides automatic translation between languages, allowing users to chat in their preferred language while others see messages translated to their preferred language. Built with React, Node.js, Express, WebSockets, PostgreSQL, and Google Translate integration.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Radix UI components with Tailwind CSS styling
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Real-time Communication**: WebSocket server for live chat functionality
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL storage
- **Translation Service**: Google Translate API integration via Google Apps Script

### Database Architecture
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Connection**: Neon serverless PostgreSQL database
- **Schema Management**: Drizzle Kit for migrations and schema management

## Key Components

### Authentication System
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **User Management**: Complete user profile system with language preferences
- **Security**: HTTP-only cookies with CSRF protection

### Real-time Chat System
- **WebSocket Server**: Custom WebSocket implementation with Express integration
- **Message Broadcasting**: Real-time message distribution to all connected clients
- **Connection Management**: Automatic reconnection and connection state tracking
- **Message Persistence**: All messages stored in PostgreSQL with sender information

### Translation Engine
- **Service**: Google Translate API accessed via Google Apps Script proxy
- **Language Detection**: Automatic language detection with regex patterns
- **Supported Languages**: 15 languages including English, Japanese, Spanish, French, German, Chinese, Korean, Portuguese, Russian, Arabic, Hindi, Italian, Dutch, Thai, and Vietnamese
- **Translation Preferences**: Per-user settings for preferred language and auto-translation

### Chat Room System
- **Multi-room Support**: Users can create and join different chat rooms
- **Room Management**: Room creation, deletion, and activity tracking
- **Administrative Controls**: Admin-only rooms and moderation capabilities
- **Cleanup System**: Automatic cleanup of inactive rooms

### User Interface
- **Responsive Design**: Mobile-first approach with touch-optimized interfaces
- **Internationalization**: Multi-language UI support with user-configurable interface language
- **Profile Management**: Custom profile images with Google profile integration
- **Settings Panel**: Comprehensive user preferences including language and translation settings

## Data Flow

### Message Flow
1. User types message in their preferred language
2. WebSocket client detects language and sends to server
3. Server stores original message in database
4. Server broadcasts message to all connected clients
5. Each client receives message and applies user's translation preferences
6. Client displays original and/or translated text based on user settings

### User Authentication Flow
1. User clicks "Sign in with Google" on landing page
2. Redirected to Replit Auth OIDC provider
3. Upon successful authentication, user data stored/updated in database
4. Session created and stored in PostgreSQL
5. User redirected to main chat interface

### Translation Flow
1. Client detects message language using regex patterns
2. If auto-translate enabled and languages differ, API request sent to server
3. Server forwards request to Google Apps Script proxy
4. Translated text returned and displayed to user
5. User can toggle between original and translated text

## External Dependencies

### Core Dependencies
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Type-safe database ORM with PostgreSQL support
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **wouter**: Lightweight client-side routing
- **ws**: WebSocket implementation for real-time communication

### UI Dependencies
- **@radix-ui/***: Comprehensive accessible UI component library
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Authentication Dependencies
- **openid-client**: OpenID Connect client implementation
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### Development Dependencies
- **vite**: Fast build tool with HMR
- **typescript**: Type safety across the application
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- **Runtime**: Replit with Node.js 20
- **Database**: PostgreSQL 16 provisioned through Replit
- **Development Server**: Vite dev server with Express backend proxy
- **Hot Reloading**: Full-stack hot module replacement

### Production Deployment
- **Platform**: Replit Autoscale deployment
- **Build Process**: 
  1. Vite builds optimized client bundle
  2. esbuild bundles server code for production
  3. Static files served from Express
- **Database**: Production PostgreSQL instance via environment variables
- **Session Security**: Secure HTTP-only cookies in production mode

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **SESSION_SECRET**: Secure session signing key
- **REPLIT_DOMAINS**: Allowed domains for OIDC
- **ISSUER_URL**: OpenID Connect issuer endpoint
- **NODE_ENV**: Environment mode (development/production)

## Recent Changes

- **June 14, 2025**: WebSocket Connection and Room Management Fixes
  - Resolved language settings causing room deletion button disappearance
  - Enhanced multi-layer authentication with persistent user ID storage
  - Fixed WebSocket path conflicts between Vite dev server and application WebSocket
  - Implemented WebSocket connection on custom '/websocket' path to avoid frame errors
  - Improved connection state management and duplicate connection prevention
  - Enhanced room ownership verification with multiple authentication fallback sources
  - Stabilized user data persistence across settings changes and room navigation
  - Fixed "切断されました - 再接続中..." errors in newly created rooms
  - Added robust reconnection logic with smart retry mechanisms

- **June 13, 2025**: Enhanced mobile room deletion functionality and navigation
  - Added larger touch targets for mobile delete buttons (8x8px vs 6x6px)
  - Implemented mobile-only action bar at bottom of room cards with prominent "削除" button
  - Fixed translation system variable conflicts and enhanced fallback translations
  - Improved mobile accessibility for room management interface
  - Added mobile-first room list display with proper scrolling functionality
  - Implemented "ルーム一覧" navigation button in chat header for mobile users
  - Fixed mobile room list layout with flexible header and scrollable content area
  - Prevented automatic room selection after deletion to avoid unwanted Global Chat display
  - Ensured room deletion returns user to room list instead of auto-selecting other rooms
  - Fixed delete button disappearing after language settings changes with robust user authentication checks
  - Implemented defensive programming patterns for user state management during settings updates
  - Resolved TypeScript compatibility issues and type conversion conflicts in room ownership verification
  - Enhanced deletion logic with dedicated `isRoomOwner` function for consistent ownership validation

## Changelog

```
Changelog:
- June 13, 2025. Initial setup
- June 13, 2025. Mobile room deletion enhancements
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
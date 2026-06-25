# MentorX - Quick Start Guide

## Project Overview

MentorX is an AI-powered learning platform with hybrid authentication using Firebase (Google OAuth), MongoDB (user data), JWT tokens, and Redux state management.

---

## Project Structure

```
MentorX/
├── backend/
│   ├── app.py                      # FastAPI application entry
│   ├── database.py                 # MongoDB connection
│   ├── requirements.txt            # Python dependencies
│   ├── controllers/
│   │   ├── userController.py       # Auth endpoints
│   │   ├── kgController.py         # Knowledge graph
│   │   └── quizController.py       # Quiz endpoints
│   ├── models/
│   │   └── userModel.py            # Pydantic models
│   └── utils/
│       └── auth.py                 # JWT & password hashing
│
└── frontend/
    ├── src/
    │   ├── App.jsx                 # Router setup & auth init
    │   ├── main.jsx                # Redux provider
    │   ├── firebase.js             # Firebase config
    │   ├── store/
    │   │   ├── store.js            # Redux store
    │   │   ├── authSlice.js        # Auth state management
    │   │   └── uiSlice.js          # UI preferences
    │   ├── services/
    │   │   └── service.js          # API client & token management
    │   ├── components/
    │   │   └── LandingPage/
    │   │       ├── Header/         # Navigation
    │   │       └── Auth/
    │   │           └── SignInModal.jsx  # Auth modal
    │   ├── pages/
    │   │   ├── LandingPage/
    │   │   └── Dashboard/
    │   └── layout/
    │       └── Layout.jsx          # Conditional layout
    └── package.json
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB Atlas account or local MongoDB
- Firebase project with Google OAuth enabled

### Backend Setup

1. **Install dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Create `.env` file:**
```env
MONGO_URI=YOUR_MONGOBD_URI
JWT_SECRET=your-random-secret-key-256-bits
JWT_REFRESH_SECRET=your-different-random-secret-key
JWT_EXPIRE_MINUTES=15
JWT_REFRESH_EXPIRE_DAYS=7
```

3. **Run backend:**
```bash
uvicorn app:app --reload --port 8000
```

Backend will run at: `http://localhost:8000`

### Frontend Setup

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Create `.env` file:**
```env
VITE_API_BASE=http://localhost:8000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
```

3. **Run frontend:**
```bash
npm run dev
```

Frontend will run at: `http://localhost:5173`

---

## Authentication System

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  AUTHENTICATION FLOW                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Frontend (React)                                    │
│  ┌──────────────────────────────────────────────┐   │
│  │  1. User Action (Login/Register/Google)      │   │
│  └────────────────┬─────────────────────────────┘   │
│                   │                                  │
│                   ▼                                  │
│  ┌──────────────────────────────────────────────┐   │
│  │  2. Redux Action (loginSuccess/logout)       │   │
│  └────────────────┬─────────────────────────────┘   │
│                   │                                  │
│                   ▼                                  │
│  ┌──────────────────────────────────────────────┐   │
│  │  3. Store tokens in localStorage              │   │
│  │     - mx_access_token                         │   │
│  │     - mx_refresh_token                        │   │
│  │     - mx_user (profile data)                  │   │
│  └────────────────┬─────────────────────────────┘   │
│                   │                                  │
│                   ▼                                  │
│  ┌──────────────────────────────────────────────┐   │
│  │  4. API requests use authenticatedFetch()    │   │
│  │     - Adds Bearer token to headers           │   │
│  │     - Auto-refreshes on 401                   │   │
│  └────────────────┬─────────────────────────────┘   │
└───────────────────┼──────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                   │
│  ┌──────────────────────────────────────────────┐   │
│  │  5. Verify JWT token                          │   │
│  │     - Extract from Authorization header       │   │
│  │     - Decode and validate                     │   │
│  └────────────────┬─────────────────────────────┘   │
│                   │                                  │
│                   ▼                                  │
│  ┌──────────────────────────────────────────────┐   │
│  │  6. Query MongoDB                             │   │
│  │     - Find user by ID from token              │   │
│  │     - Return user data                        │   │
│  └────────────────┬─────────────────────────────┘   │
└───────────────────┼──────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  MongoDB (User Database)                             │
│  ┌──────────────────────────────────────────────┐   │
│  │  users collection                             │   │
│  │  {                                            │   │
│  │    _id: ObjectId,                             │   │
│  │    email: string,                             │   │
│  │    username: string,                          │   │
│  │    password: string (Argon2 hashed),          │   │
│  │    firebase_uid: string (for Google),         │   │
│  │    created_at: datetime                       │   │
│  │  }                                            │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Dual Authentication
- **Email/Password**: Traditional authentication with Argon2 hashing
- **Google OAuth**: Firebase-powered Google sign-in

### 2. JWT Token Management
- **Access Token**: 15-minute expiry (API authentication)
- **Refresh Token**: 7-day expiry (token renewal)
- **Automatic Refresh**: Seamless token renewal on expiration

### 3. Redux State Management
- **Global Auth State**: Accessible throughout the app
- **Persistent Sessions**: localStorage integration
- **Automatic Rehydration**: Session restored on page refresh

### 4. Protected Routes
- Dashboard requires authentication
- Automatic redirect to login if not authenticated
- Token validation on app load

### 5. Security Features
- Argon2 password hashing (memory-hard)
- JWT with separate secrets for access/refresh
- MongoDB unique indexes (email, username, phone)
- CORS protection
- XSS protection via React

---

##  Common Flow
### Email/Password Registration
1. User fills form → `POST /users/register`
2. Backend hashes password → stores in MongoDB
3. Backend generates JWT tokens
4. Frontend stores tokens → dispatches `loginSuccess`
5. Redirects to `/dashboard`

### Google OAuth Login
1. User clicks "Continue with Google"
2. Firebase popup → Google authentication
3. Firebase returns user credentials
4. Frontend extracts user data & tokens
5. Dispatches `loginSuccess` → redirects to `/dashboard`

### API Request with Token Refresh
1. Component calls `authenticatedFetch('/api/data')`
2. Adds `Authorization: Bearer <access_token>` header
3. If 401 response → automatically calls `/users/refresh-token`
4. Gets new tokens → retries original request
5. If refresh fails → clears tokens and redirects to login

---

##  State Structure

### Redux Auth State
```javascript
{
  auth: {
    isLoggedIn: true,
    currentUser: {
      id: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      username: "johndoe",
      displayName: "John Doe",
      photoURL: "https://...",
      provider: "google" | "email"
    },
    accessToken: "eyJhbGciOiJIUzI1NiIs...",
    refreshToken: "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### localStorage Keys
- `mx_access_token`: JWT access token
- `mx_refresh_token`: JWT refresh token
- `mx_user`: User profile JSON

---

## API Endpoints

### Authentication
- `POST /users/register` - Create new account
- `POST /users/login` - Email/password login
- `POST /users/google-verify` - Verify Google OAuth
- `POST /users/refresh-token` - Refresh access token
- `GET /users/me` - Get current user (protected)

### User Management
- `PATCH /users/profile` - Update profile
- `PATCH /users/personalization` - Update learning preferences

### Learning Features
- `POST /kg/generate` - Generate knowledge graph
- `POST /kg/evaluate` - Evaluate explanation
- `POST /quiz/start` - Start quiz session
- `POST /quiz/next` - Get next question

### Resources Management
- `POST /resources/generate-notes` - Generate PDF notes from quiz results (auto-called after quiz finish)
- `GET /resources/my-resources` - Get all user's resources
- `DELETE /resources/{resource_id}` - **Delete resource (removes from Cloudinary AND MongoDB)**

#### Delete Resource Details
When you delete a resource:
1. **Cloudinary**: PDF file is permanently removed from cloud storage
2. **MongoDB**: Resource link is removed from user's database document
3. **Response**: Includes status for both deletions with detailed feedback

Example response:
```json
{
  "success": true,
  "message": "Resource deleted successfully from both Cloudinary and MongoDB",
  "deleted_resource_id": "uuid-here",
  "topic": "Python Variables",
  "cloudinary_deleted": true,
  "mongodb_deleted": true,
  "details": {
    "cloudinary_public_id": "mentorx/resources/USER_ID/...",
    "cloudinary_status": "deleted",
    "mongodb_status": "deleted"
  }
}
```




**Quick Start Version:** 1.0  
**Last Updated:** December 6, 2025

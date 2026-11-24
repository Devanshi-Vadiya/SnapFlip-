# ⚡ SnapFlip - Next-Gen Social Camera & Ephemeral Stories

<div align="center">

![SnapFlip Banner](https://img.shields.io/badge/SnapFlip-Electric%20Yellow%20%26%20Obsidian-FFFC00?style=for-the-badge&logoColor=black)
![React Native](https://img.shields.io/badge/React%20Native-0.86-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=for-the-badge&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Media%20CDN-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)

**A high-performance, Snapchat-inspired social mobile experience built with React Native (Expo Router), Node.js/Express, MongoDB Atlas, and Cloudinary.**

[Architecture](#-architecture) • [Features](#-features) • [Screenshots & UI](#-screens--design-system) • [API Documentation](#-api-specification) • [Getting Started](#-getting-started)

</div>

---

## 🌟 Overview

**SnapFlip** bridges the gap between fast camera-first ephemeral messaging and rich community social feeds. Designed with an **Obsidian Dark (`#0A0B10`) & Electric Yellow (`#FFFC00`)** aesthetic, SnapFlip delivers a fluid, tactile mobile experience featuring 24-hour self-destructing stories, live camera filters, relational comments, persistent likes, 1-on-1 direct messaging, and creator discovery.

---

## 🚀 Features

### 📸 1. Camera Studio & Live Overlays
* **Live Camera Viewport**: Fullscreen camera interface powered by `expo-camera` with back/front flip and torch/flash toggles.
* **Filter Engine**:
  * **Color Grading**: Warm, Cool, B&W Monochrome, and Vintage Grain filters.
  * **Dynamic Overlays**: Real-time digital clock overlay, reverse geocoded location stamp (`expo-location`), and customizable snap caption banners.
* **Offscreen Capture**: High-fidelity snap flattening via `react-native-view-shot` before dispatching to Cloudinary CDN.
* **Dual Routing**: Instantly publish snaps to either **My Story** (ephemeral 24h) or **Snap Feed** (permanent social feed).

### 🌟 2. 24-Hour Ephemeral Stories
* **Story Tray**: Horizontal scroll tray with electric yellow rings for unseen stories and subtle muted borders for viewed stories.
* **Interactive Story Viewer**: Fullscreen viewer with multi-story progression bars (5-second auto-advance), tap-to-skip, tap-to-rewind, and swipe-down-to-dismiss gestures.
* **View Counting**: Tracks viewers per story without duplicate counting.
* **Automated Expiry**: MongoDB TTL (Time-To-Live) index on `createdAt` automatically cleans up expired story documents after 86,400 seconds (24 hours).

### 📰 3. Dynamic Photo Feed & Engagement
* **Optimistic Social Actions**: Instant, persistent like/unlike toggling backed by atomic MongoDB `$addToSet` / `$pull` operations.
* **Relational Comment Threads**: Bottom-sheet style discussion modal linked to MongoDB relational `Comment` collection.
* **Cloud Asset Management**: Verified photo owners can delete their snaps, triggering automatic removal of media assets from Cloudinary via Admin API and cascading deletion of associated comments.
* **Pull-to-Refresh & Relative Timestamps**: Seamless feed synchronization with humanized timestamps ("just now", "15m ago", "2d ago").

### 💬 4. 1-on-1 Chat & Direct Messaging
* **Direct Conversations**: Private messaging channel between creators.
* **Conversation List**: Real-time preview of recent chats, message snippets, and formatted relative timestamps.
* **Direct Snaps Integration**: Seamlessly find creators and start conversations.

### 🔍 5. Creator Discovery & Search
* **Real-time User Search**: Instant creator lookup by username or email.
* **Creator Cards**: Visual profile badges showing creator join date, bio, and a 1-tap shortcut to launch a direct message conversation.

### 👤 6. User Profile & Media Gallery
* **Profile Management**: Customizable bio and avatar display.
* **Stats Counter**: Live computation of uploaded snaps, total likes received, and community interactions.
* **3-Column Snap Grid**: Responsive photo grid with full-resolution snap inspect modal and in-place delete capabilities.
* **Secure Logout**: Clears authentication tokens and resets application state cleanly.

---

## 🏗 Architecture

```
SnapFlip Mobile Client (Expo / React Native)
│
├── Navigation: Expo Router (5-Tab Native Navigation + Auth Stack)
├── State & Storage: expo-secure-store (JWT Persistence)
└── Media Processing: react-native-view-shot -> Multipart Upload
       │
       ▼ (HTTPS REST API)
SnapFlip Express API (Node.js / Express)
       │
       ├── Middleware: JWT Verification, Multer Storage, CORS, Error Handler
       ├── MongoDB Atlas: Users, Photos, Comments, Stories, Messages
       └── Cloudinary CDN: Optimized Cloud Image Storage & Deletion
```

### Database Models

| Collection | Model Details & Relationships |
| :--- | :--- |
| **Users** | `username` (unique), `email` (unique, lowercase), `password` (bcrypt hashed), `avatarUrl`, `bio`, `createdAt` |
| **Photos** | `image` (Cloudinary URL), `cloudinaryPublicId`, `user` (ref: `User`), `caption`, `filter`, `likes` ([ref: `User`]), `createdAt` |
| **Stories** | `image` (Cloudinary URL), `cloudinaryPublicId`, `user` (ref: `User`), `caption`, `filter`, `viewers` ([ref: `User`]), `createdAt` (TTL index: 24h) |
| **Comments** | `photo` (ref: `Photo`), `user` (ref: `User`), `text`, `createdAt` |
| **Messages** | `sender` (ref: `User`), `recipient` (ref: `User`), `text`, `createdAt` |

---

## 🎨 Screens & Design System

The application uses an Obsidian & Electric Yellow design system engineered for high contrast and modern aesthetics:

* **Background Obsidian**: `#0A0B10`
* **Card Surface**: `#131622`
* **Border Stroke**: `#1E2234`
* **Accent Yellow**: `#FFFC00`
* **Text Primary**: `#FFFFFF`
* **Text Secondary**: `#8E92A4`

### Key Screens

1. **`app/camera.tsx`**: Dual-mode camera with real-time filters (Warm, Cool, B&W, Vintage, Time, Location, Text), front/back flip, torch toggle, and snap review bar.
2. **`app/feed.tsx`**: Dynamic feed with 24-hour Story Tray, pull-to-refresh, double-tap/heart like toggle, comments modal, and snap deletion.
3. **`app/discover.tsx`**: Creator search directory with debounced query execution and instant message launch.
4. **`app/chat.tsx`**: 1-on-1 private messaging hub with conversation history and clean chat bubbles.
5. **`app/profile.tsx`**: User stats, bio editor, 3-column personal snap grid, and snap details modal.
6. **`app/login.tsx` & `app/register.tsx`**: Secure authentication with show/hide password toggles and validation feedback.

---

## 📡 API Specification

### Authentication
* `POST /api/auth/register` - Create a new user account with hashed password.
* `POST /api/auth/login` - Authenticate credentials and issue JWT token.
* `GET  /api/auth/me` - Validate active JWT and return user profile.

### Photos & Feed
* `GET    /api/photos` - Retrieve public photo feed with populated user details and `isLikedByMe`.
* `POST   /api/photos/upload` - Upload image to Cloudinary and save photo record (Multipart).
* `PUT    /api/photos/:id/like` - Toggle like/unlike atomically on a photo.
* `DELETE /api/photos/:id` - Delete photo from MongoDB and delete asset from Cloudinary CDN.

### Ephemeral Stories
* `POST   /api/stories/upload` - Post a new 24-hour expiring story.
* `GET    /api/stories/feed` - Fetch active stories grouped by creator.
* `POST   /api/stories/:id/view` - Record story view for current user.
* `DELETE /api/stories/:id` - Delete story and Cloudinary asset.

### Comments
* `GET  /api/comments/:photoId` - Fetch all comments for a photo.
* `POST /api/comments/:photoId` - Post a comment on a photo.

### Social & Chat
* `GET  /api/users/search?q=:query` - Search creators by username or email.
* `PUT  /api/users/profile` - Update bio and avatar.
* `GET  /api/chat/conversations` - Fetch all active conversations for the user.
* `GET  /api/chat/:userId` - Fetch message exchange between two users.
* `POST /api/chat/:userId` - Send direct message to a user.

---

## 🛠 Getting Started

### Prerequisites
* **Node.js**: v18 or higher
* **Expo Go** or an iOS/Android Simulator
* **MongoDB Atlas** database cluster
* **Cloudinary** developer account

---

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (`backend/.env`):
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/snapflip?retryWrites=true&w=majority
   JWT_SECRET=your_jwt_super_secret_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```
4. Start the server:
   ```bash
   npm run dev
   # or
   node server.js
   ```

---

### Frontend Setup

1. Navigate to the frontend directory (`camproj`):
   ```bash
   cd camproj
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Verify or update backend API URL in `camproj/api/api.ts`:
   ```typescript
   export const API_URL = "https://snapflip-e6pp.onrender.com"; // or your local IP: http://192.168.x.x:5000
   ```
4. Launch Expo:
   ```bash
   npx expo start
   ```
5. Scan the QR code using the **Expo Go** app on your physical iOS/Android device, or press `a` for Android Emulator / `i` for iOS Simulator.

---

## 🧪 Quality Assurance & Type Safety

SnapFlip includes strict TypeScript compilation across all screens, hooks, navigation components, and API helpers.

Run TypeScript validation:
```bash
npx tsc --noEmit
```
*(Result: 0 errors across all routes and components)*

---

## 📄 License

This project is licensed under the MIT License.

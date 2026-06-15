# Scrapbook — Backend Reference

All Convex queries and mutations. The backend is **shared between web and RN** — zero changes needed for the mobile rebuild. This file is a reference for what's available when building screens.

## Setup in React Native

```tsx
// app/_layout.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export default function RootLayout() {
  return (
    <ConvexAuthProvider client={convex}>
      {/* your navigator */}
    </ConvexAuthProvider>
  );
}
```

Environment variable: `EXPO_PUBLIC_CONVEX_URL` (same value as `NEXT_PUBLIC_CONVEX_URL`).

---

## Data model (schema.ts)

```ts
users: {
  name: string
  email: string
  avatarPreset?: string        // "a01"–"a08"
  avatarStorageId?: Id<"_storage">
  nickname?: string
  birthday?: string            // ISO date "yyyy-mm-dd"
}

spaces: {
  name: string
  createdBy: Id<"users">
  status: "solo" | "paired"
  startDate?: string           // ISO date "yyyy-mm-dd" — relationship anniversary
}

memberships: {
  spaceId: Id<"spaces">
  userId: Id<"users">
  joinedAt: number             // unix ms
}
// indexes: by_space, by_user

invites: {
  spaceId: Id<"spaces">
  code: string                 // 6-char Crockford base32
  createdBy: Id<"users">
  usedBy?: Id<"users">
  usedAt?: number
  expiresAt?: number
}
// indexes: by_code, by_space

memories: {
  spaceId: Id<"spaces">
  authorId: Id<"users">
  title: string
  caption: string              // auto-derived: body.trim().slice(0, 80)
  body: string
  date: string                 // "yyyy-mm-dd"
  weekday: string              // "Monday", "Tuesday", etc.
  weather?: "sunny" | "cloudy" | "rainy"
  location?: string
  stickers?: string[]
  scene: string                // "photo" | "coffee" | "couple" | "sunset" | "flowers" | "airplane" | "river"
  audioStorageId?: Id<"_storage">
}
// indexes: by_space, by_space_date

mediaAssets: {
  storageId: Id<"_storage">
  uploadedBy: Id<"users">
  spaceId: Id<"spaces">
  kind: "photo" | "audio" | "avatar"
  memoryId?: Id<"memories">
}
// indexes: by_space, by_memory

comments: {
  memoryId: Id<"memories">
  authorId: Id<"users">
  body: string
  createdAt: number
  photoStorageId?: Id<"_storage">  // set when comment is tagged to a specific photo
}
// index: by_memory

reactions: {
  memoryId: Id<"memories">
  userId: Id<"users">
  emoji: string                // "heart"
  photoStorageId?: Id<"_storage">  // set for per-photo reactions
}
// indexes: by_memory, by_memory_user

todos: {
  spaceId: Id<"spaces">
  title: string
  notes?: string
  assigneeId?: Id<"users">
  due?: string                 // free-text: "Today", "Sat", "May 22"
  category: "errand" | "date" | "trip" | "read" | "home"
  done: boolean
  createdBy: Id<"users">
  createdAt: number
}
// indexes: by_space, by_space_done

dailyQuestions: {
  spaceId: Id<"spaces">
  prompt: string
  emoji: string
  tint: "pink" | "yellow" | "blue" | "green"
  date: string                 // "yyyy-mm-dd"
}
// index: by_space_date

answers: {
  questionId: Id<"dailyQuestions">
  userId: Id<"users">
  spaceId: Id<"spaces">
  body: string
  createdAt: number
}
// indexes: by_user, by_space, by_question

spaceFavorites: {
  spaceId: Id<"spaces">
  memoryId?: Id<"memories">
  photoStorageIds?: Id<"_storage">[]
  songName?: string
  songArtist?: string
  spotifyTrackId?: string
  places?: string
  movie?: string
  activities?: string
}
// index: by_space
```

---

## users.ts

### `api.users.getCurrentUser` — query
Returns the current authenticated user's full document, or `null`.
```ts
// Returns: Doc<"users"> | null
useQuery(api.users.getCurrentUser)
```

### `api.users.updateProfile` — mutation
Updates the current user's profile. `avatarPreset` and `avatarStorageId` are mutually exclusive.
```ts
useMutation(api.users.updateProfile)
// Args:
{
  name: string
  avatarPreset?: string
  avatarStorageId?: Id<"_storage">
  nickname?: string
  birthday?: string            // "yyyy-mm-dd"
}
```

### `api.users.generateUploadUrl` — mutation
Returns a short-lived Convex storage upload URL. Use with a direct `fetch` POST.
```ts
const url = await generateUploadUrl()
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": file.type },
  body: file,
})
const { storageId } = await res.json()
```

---

## spaces.ts

### `api.spaces.mySpace` — query
Returns the current user's space, all members with resolved avatar URLs, and space status.
```ts
// Returns:
{
  space: Doc<"spaces">
  members: Array<{
    userId: Id<"users">
    name: string
    avatarPreset: string | null
    avatarUrl: string | null    // resolved Convex storage URL
  }>
  status: "solo" | "paired"
} | null
```

### `api.spaces.stats` — query
Returns counts for the current user's space.
```ts
// Returns: { memoriesCount: number, photosCount: number, voiceNotesCount: number }
```

### `api.spaces.updateStartDate` — mutation
Sets the relationship anniversary date.
```ts
// Args: { startDate: string }  // "yyyy-mm-dd"
```

---

## memories.ts

### `api.memories.list` — query
Returns up to 100 memories for the current user's space, newest first.
```ts
// Returns: Array<Doc<"memories"> & { firstPhotoUrl: string | null }>
```

### `api.memories.get` — query
Returns a single memory with all photos and audio URL resolved.
```ts
// Args: { id: Id<"memories"> }
// Returns:
{
  ...Doc<"memories">
  photos: Array<{ url: string, storageId: Id<"_storage"> }>
  audioUrl: string | null
} | null
```

### `api.memories.create` — mutation
```ts
// Args:
{
  title: string
  body: string
  date: string                 // "yyyy-mm-dd"
  weekday: string
  location?: string
  scene: "coffee"|"couple"|"sunset"|"flowers"|"airplane"|"river"|"photo"
  photoStorageIds?: Id<"_storage">[]
  audioStorageId?: Id<"_storage">
}
// Returns: Id<"memories">
```

### `api.memories.update` — mutation
All fields optional. `caption` is auto-updated when `body` changes.
```ts
// Args:
{
  id: Id<"memories">
  title?: string
  body?: string
  date?: string
  weekday?: string
  location?: string
  scene?: string
}
```

### `api.memories.addPhotos` — mutation
Adds photo assets to an existing memory. Sets `scene = "photo"`.
```ts
// Args: { id: Id<"memories">, photoStorageIds: Id<"_storage">[] }
```

### `api.memories.removePhoto` — mutation
Deletes a photo asset and its backing storage file. Resets scene to random if no photos remain.
```ts
// Args: { memoryId: Id<"memories">, storageId: Id<"_storage"> }
```

### `api.memories.remove` — mutation
Deletes the memory and cascades: all mediaAssets + storage, audioStorageId storage, comments, reactions.
```ts
// Args: { id: Id<"memories"> }
```

---

## reactions.ts

### `api.reactions.countsForMemory` — query
```ts
// Args: { memoryId: Id<"memories"> }
// Returns: { heartCount: number, liked: boolean }
```

### `api.reactions.toggle` — mutation
Toggles a heart reaction on a memory (not on a specific photo).
```ts
// Args: { memoryId: Id<"memories"> }
```

### `api.reactions.likedPhoto` — query
Returns whether the current user has liked a specific photo.
```ts
// Args: { memoryId: Id<"memories">, storageId: Id<"_storage"> }
// Returns: boolean
```

### `api.reactions.togglePhoto` — mutation
Toggles a heart reaction on a specific photo.
```ts
// Args: { memoryId: Id<"memories">, storageId: Id<"_storage"> }
```

---

## comments.ts

### `api.comments.listForMemory` — query
```ts
// Args: { memoryId: Id<"memories"> }
// Returns: Array<{
//   _id: Id<"comments">
//   authorId: Id<"users">
//   authorName: string
//   authorAvatarPreset: string | null
//   authorAvatarUrl: string | null
//   body: string
//   createdAt: number
//   photoStorageId?: Id<"_storage">
//   photoThumbnailUrl: string | null  // resolved if photoStorageId set
// }>
```

### `api.comments.add` — mutation
```ts
// Args: { memoryId: Id<"memories">, body: string, photoStorageId?: Id<"_storage"> }
```

### `api.comments.remove` — mutation
Can only remove your own comments.
```ts
// Args: { id: Id<"comments"> }
```

---

## todos.ts

### `api.todos.list` — query
Returns all todos for the space (up to 200), newest first.
```ts
// Returns: Doc<"todos">[]
```

### `api.todos.create` — mutation
```ts
// Args:
{
  title: string
  notes?: string
  assigneeId?: Id<"users">
  category: "errand" | "date" | "trip" | "read" | "home"
  due?: string                 // free text
}
```

### `api.todos.toggle` — mutation
```ts
// Args: { id: Id<"todos"> }
```

### `api.todos.update` — mutation
```ts
// Args: { id: Id<"todos">, title?: string, notes?: string, assigneeId?: Id<"users">, category?: string, due?: string }
```

### `api.todos.remove` — mutation
```ts
// Args: { id: Id<"todos"> }
```

---

## dailyQuestions.ts

### `api.dailyQuestions.ensureTriad` — mutation
Idempotent. Creates today's 3 questions for the space if they don't exist. Call on screen mount.
```ts
// Args: {}
```

### `api.dailyQuestions.todayTriad` — query
Returns today's 3 questions with answer state.
```ts
// Returns: Array<{
//   _id: Id<"dailyQuestions">
//   prompt: string
//   emoji: string
//   tint: "pink" | "yellow" | "blue" | "green"
//   myAnswer: string | null
//   partnerAnswer: string | null | "locked"  // "locked" = you haven't answered yet
// }>
```

### `api.dailyQuestions.answer` — mutation
```ts
// Args: { questionId: Id<"dailyQuestions">, body: string }
```

### `api.dailyQuestions.history` — query
Returns past answered questions with both member's answers.
```ts
// Returns: Array<{
//   prompt: string, emoji: string, tint: string, date: string
//   myAnswer: string, partnerAnswer: string | null
// }>
```

---

## invites.ts

### `api.invites.create` — mutation
Creates a new invite (or returns existing valid one). Code is a 6-char Crockford base32 string. Expires in 7 days.
```ts
// Returns: { code: string, expiresAt: number }
```

### `api.invites.mine` — query
Returns the current user's active invite with code.
```ts
// Returns: { code: string, expiresAt: number | undefined } | null
```

### `api.invites.getByCode` — query
Validates an invite code.
```ts
// Args: { code: string }
// Returns:
//   { status: "valid", inviterName: string, inviterAvatarPreset: string | null, inviterAvatarUrl: string | null }
//   { status: "used" }
//   { status: "expired" }
//   { status: "not_found" }
```

### `api.invites.accept` — mutation
Accepts an invite. Merges the joiner's solo space data into the inviter's space. Safe to call if already a member.
```ts
// Args: { code: string }
```

---

## favorites.ts

### `api.favorites.get` — query
Returns the space's favorites document with resolved URLs.
```ts
// Returns:
{
  ...Doc<"spaceFavorites">
  memoryTitle: string | null
  memoryDate: string | null
  memoryScene: string | null
  photoUrls: string[]          // resolved storage URLs
} | null
```

### `api.favorites.upsert` — mutation
Creates or patches the space favorites. All fields optional — only pass what you want to update.
```ts
// Args:
{
  memoryId?: Id<"memories">
  photoStorageIds?: Id<"_storage">[]
  songName?: string
  songArtist?: string
  spotifyTrackId?: string
  places?: string
  movie?: string
  activities?: string
}
```

---

## useSpace() hook

Convenience hook used on almost every screen. Returns resolved space state from `api.spaces.mySpace` + `api.users.getCurrentUser` + `api.invites.mine`.

```ts
// lib/useSpace.ts
const { isLoading, status, space, members, currentUser, invite } = useSpace()

// status: "solo" | "paired"
// space: Doc<"spaces"> | null
// members: Array<{ userId, name, avatarPreset, avatarUrl }>
// currentUser: Doc<"users"> | null  — raw user row (no avatarUrl resolved)
// invite: { code, shareUrl, expiresAt } | null
```

**Important**: `currentUser` from this hook does NOT have `avatarUrl` resolved.
To get the resolved URL, find the current user in `members`:
```ts
const myMember = members.find(m => m.userId === currentUser?._id)
// myMember.avatarUrl — the resolved storage URL
```

---

## File upload pattern

Used for photos, voice memos, and avatars. The same pattern works in RN:

```ts
// 1. Get a short-lived upload URL from Convex
const uploadUrl = await generateUploadUrl()  // useMutation(api.users.generateUploadUrl)

// 2. POST the file directly to Convex storage
const response = await fetch(uploadUrl, {
  method: "POST",
  headers: { "Content-Type": mimeType },   // e.g. "image/jpeg", "audio/webm"
  body: fileBlob,                           // in RN: fetch(localUri).then(r => r.blob())
})
const { storageId } = await response.json()

// 3. Pass storageId to the relevant mutation
await createMemory({ photoStorageIds: [storageId], ... })
```

In React Native, convert a local file URI to a blob:
```ts
const blob = await fetch(localUri).then(r => r.blob())
```

---

## Spotify search (web API route)

The web app proxies Spotify search through a Next.js API route. In the RN app you can:
- Call the same hosted API route if the web app is deployed
- Or call Spotify's API directly (client credentials flow in a Convex action)

```
GET /api/spotify/search?q=<query>
Returns: Array<{ id, name, artist, albumArt, previewUrl }> | { error: "not_configured" }

Env vars required: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
```

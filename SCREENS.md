# Scrapbook — Screen Inventory

Every screen in the app. For each: route → Expo Router equivalent, data dependencies, key UI, and RN porting notes.

---

## Navigation structure

```
Stack (no tab bar):
  /sign-in             → (auth)/sign-in
  /sign-up             → (auth)/sign-up
  /onboarding/profile  → onboarding/profile
  /onboarding/invite   → onboarding/invite
  /invite/[code]       → invite/[code]

Tab navigator (BottomNav):
  /home                → (tabs)/home
  /journal             → (tabs)/journal
  /calendar            → (tabs)/calendar
  /profile             → (tabs)/profile

Stack (push from tabs):
  /daily-question      → daily-question
  /todos               → todos
  /memory/[id]         → memory/[id]
  /memory/[id]/edit    → memory/[id]/edit
  /new                 → new
  /settings            → settings
```

---

## Auth screens

### Sign In (`/sign-in`)
**Data**: none (uses `@convex-dev/auth`)
**UI**:
- Email + password inputs
- "Sign in" CTA
- OAuth buttons: Apple, Google (stubs in RN → use `expo-auth-session`)
- Link to sign up
**RN notes**: Use `useAuthActions().signIn(...)` from `@convex-dev/auth/react`. Replace `next/navigation` router with `expo-router`'s `useRouter`.

### Sign Up (`/sign-up`)
**Data**: none
**UI**: Same layout as sign in with confirm password field.
**RN notes**: Identical to sign-in migration.

---

## Onboarding

### Profile Setup (`/onboarding/profile`)
**Data**:
- `useMutation(api.users.updateProfile)` — saves name + avatar

**UI**:
- Headline copy ("your space, your face 🌸")
- `AvatarGallery` — 8 preset tiles + upload tile (triggers `ImageCropModal` after selecting a file)
- Name text input (max 24 chars, character counter)
- "Continue" button → navigates to invite screen
- If `?from=invite` query param → "Save & go home" instead

**RN notes**:
- Replace `AvatarGallery` file input with `expo-image-picker`
- Replace `ImageCropModal` canvas crop with `expo-image-manipulator` or `react-native-image-crop-picker`
- Use `TextInput` with `maxLength={24}`

### Invite Partner (`/onboarding/invite`)
**Data**:
- `useMutation(api.invites.create)` — runs on mount, returns `{ code, expiresAt }`

**UI**:
- 6-character code displayed as individual character tiles
- "Copy link" button → copies full invite URL to clipboard
- "Share" button → native share sheet
- Quick-share row: iMessage (sms: link), WhatsApp, Email
- "Continue to home →" + "Skip for now" CTAs

**RN notes**:
- Use `expo-clipboard` for copy
- Use `Share.share(...)` from `react-native` for the share sheet
- `sms:` and `mailto:` deep links work via `Linking.openURL()` in RN
- WhatsApp: `Linking.openURL('whatsapp://send?text=...')`

---

## Tab screens

### Home (`/home`)
**Data**:
- `useSpace()` — members, space name, invite
- `useQuery(api.memories.list)` — last 100 memories (shows first 5)
- `useQuery(api.todos.list)` — shows first 2 open todos
- `useQuery(api.dailyQuestions.todayTriad)` — featured question
- `useMutation(api.dailyQuestions.ensureTriad)` — called on mount

**UI**:
- Header: space name + notification bell
- Avatar pair row (both members side by side with heart icon; solo shows invite placeholder)
- `InvitePartnerCard` — shown when solo + invite code exists
- Daily question card (blue tint) → taps to `/daily-question`
- Shared todo preview card (green tint) → taps to `/todos`
- Memory timeline: last 5 memories as cards with photo/scene thumbnail + title + caption snippet + tape decoration
- Skeleton loaders while data loads

**RN notes**:
- `Link href="/new"` FAB replaced by tab bar's center button
- `formatDate()` helper needed (same logic)

### Journal (`/journal`)
**Data**:
- `useQuery(api.memories.list)` — all memories grouped by month

**UI**:
- Header: "Journal" title + sparkle decoration
- Memories grouped by "Month Year" with divider line + count
- Each memory: Card with `Polaroid` component + tape decoration, title, body excerpt, location + heart count metadata row
- Empty state with "Add first memory" CTA

**RN notes**:
- `Map` grouping works identically
- `Polaroid` component needs RN wrapper: `View` with border + rotation transform

### Calendar (`/calendar`)
**Data**:
- `useQuery(api.memories.list)` — builds date→memory map

**UI**:
- Month/year header with prev/next chevrons
- 7-column day grid (fills in with Sunday start-of-week padding)
- Days with memories get a coral dot indicator
- Selected day: filled pink circle
- Selected day preview card below grid — shows memory photo/scene or "no memory" prompt
- "+" button on card to create memory for that date (navigates to `/new?prefillDate=yyyy-mm-dd`)
- "View memory" button when a memory exists for selected day

**RN notes**:
- Build grid with `FlatList` (numColumns=7) or simple `View` with `flexWrap: 'wrap'`
- Date math is pure JS — works identically

### Profile (`/profile`)
**Data**:
- `useSpace()` — space, members, currentUser
- `useQuery(api.spaces.stats)` — memoriesCount, photosCount, voiceNotesCount
- `useQuery(api.favorites.get)` — resolved favorites with URLs
- `useQuery(api.memories.list)` — for favorite memory picker
- `useMutation(api.favorites.upsert)`
- `useMutation(api.users.updateProfile)`
- `useMutation(api.users.generateUploadUrl)`
- `useMutation(api.spaces.updateStartDate)`

**UI sections** (top to bottom):
1. Settings icon (top right) → navigates to `/settings`
2. **Day counter card** — two member avatars + heart, couple name, large "Day N" in coral, "since [date]" tap to edit anniversary
3. **Edit profile row** — current user avatar + name/nickname + "Edit →" chip → opens EditProfileSheet
4. **Stats grid** — 3 columns: Memories 🎀 / Photos 🖼️ / Voice notes 🎙️
5. **Favorite photos strip** — horizontal row of up to 3 photos → taps open `FavPhotosLightbox`
6. **Favorites list** — 6 rows each opening a bottom sheet:
   - Favorite memory 💝 → `FavMemorySheet` (picker from memory list)
   - Favorite photos 📸 → `FavPhotosSheet` (upload up to 3)
   - Song of us 🎵 → `SongSheet` (Spotify search via `/api/spotify/search`)
   - Places we love 📍 → `TextSheet`
   - Our movie 🎬 → `TextSheet`
   - Our activities 🎪 → `TextSheet`

**Bottom sheets** (all slide up from bottom):
- `EditProfileSheet`: AvatarGallery + name + nickname + birthday date input
- `AnniversarySheet`: calendar icon + visible date input + "Save anniversary" button
- `FavMemorySheet`: scrollable list of memories with photo/scene thumbnail
- `FavPhotosSheet`: up to 3 photo upload tiles
- `SongSheet`: search input → Spotify API results list
- `TextSheet`: textarea + save button (reused for places/movie/activities)
- `FavPhotosLightbox`: fullscreen image viewer with prev/next, dot indicators, close

**RN notes**:
- Use `react-native-bottom-sheet` or `@gorhom/bottom-sheet` for all sheets
- Date input → native `DatePickerIOS` or `@react-native-community/datetimepicker`
- Spotify search → same `/api/spotify/search` route works if hosted (or call Spotify directly in RN)
- `FavPhotosLightbox` → `Modal` with `Image` and `Animated` swipe

---

## Memory screens

### New Memory (`/new`)
**Data**:
- `useMutation(api.memories.create)`
- `useMutation(api.users.generateUploadUrl)`
- Query params: `prefillDate`, `prefillTitle`

**UI** (vertical sections):
1. Header: close ✕ + "New memory" + "Save" button
2. Date row: formatted date (clickable) + weekday + sun icon
3. Title input (max 60 chars)
4. Body textarea ("How was our day?")
5. **Photos section**: `PhotoStack` component — tinder-card stack, swipe left/right, add button, remove button
6. **Voice memo section**: tap-to-record (60s max) with live timer + stop button, preview audio player, discard button
7. **Location section**: `LocationSearch` → shows selected location with X to clear

**RN notes**:
- Photos: `expo-image-picker` for selection, same Convex upload flow
- Voice: `expo-av` `Audio.Recording` replaces `MediaRecorder`
- Location: `react-native-google-places-autocomplete` or `expo-location` + reverse geocode
- `PhotoStack` swipe: `react-native-gesture-handler` `PanGestureHandler`
- Audio upload: convert `expo-av` URI to blob with `fetch(uri)`

### Memory Detail (`/memory/[id]`)
**Data**:
- `useQuery(api.memories.get, { id })` — memory + photos array + audioUrl
- `useQuery(api.reactions.countsForMemory, { memoryId })` — heartCount + liked
- `useQuery(api.comments.listForMemory, { memoryId })` — comment list with author info
- `useQuery(api.users.getCurrentUser)`
- `useMutation(api.reactions.toggle)`
- `useMutation(api.comments.add)`
- `useMutation(api.comments.remove)`
- `useMutation(api.memories.remove)`
- `useMutation(api.users.generateUploadUrl)`
- `useMutation(api.memories.addPhotos)`

**UI**:
- `BackHeader` with MoreHorizontal options button (trailing slot)
- Date + weekday row
- **Photo display**: `PhotoStack` (if photos exist) or `Polaroid` with `PhotoPlaceholder`; tapping opens `PhotoLightbox`
- `PhotoLightbox`: fullscreen viewer with Like (per-photo heart), Comment (tagged to photo), Save (download), Share
- Title + body text + location
- Voice memo: `<audio>` / `expo-av` Audio player
- Reaction row: heart toggle + comment count + share button
- Comments section: list of `CommentRow` components
- Comment composer: user avatar + text input + send button
- FAB (camera button): add photos to existing memory
- **Options sheet**: Edit memory / Upload photos / Delete memory (with confirm step)

**RN notes**:
- `<audio>` → `expo-av` `Audio.Sound` with custom play/pause UI
- Download button → `expo-file-system` + `expo-media-library` `saveToLibraryAsync`
- Share → `expo-sharing` or `Share.share()`
- `PhotoLightbox` → full `Modal` component

### Edit Memory (`/memory/[id]/edit`)
**Data**:
- `useQuery(api.memories.get, { id })`
- `useMutation(api.memories.update)`
- `useMutation(api.memories.addPhotos)`
- `useMutation(api.memories.removePhoto)`
- `useMutation(api.users.generateUploadUrl)`

**UI**:
- Header: cancel ✕ + "Edit memory" + "Update" button
- Date picker row (same as new memory)
- Photos grid: existing photos with X delete, new uploads with ring highlight, "Add photo" tile
- Title input + body textarea
- Location search

---

## Other screens

### Daily Question (`/daily-question`)
**Data**:
- `useMutation(api.dailyQuestions.ensureTriad)` — called on mount
- `useQuery(api.dailyQuestions.todayTriad)` — 3 questions with my answer + partner answer status
- `useQuery(api.dailyQuestions.history)` — past answers (loaded on "History" tab)
- `useMutation(api.dailyQuestions.answer)`

**UI**:
- Decorative header with Sun illustration + hand-written description copy
- Tab bar: "Today" / "History"
- **Today tab**: 3 `QuestionCard` components — emoji + prompt + my answer textarea (or saved bubble) + partner answer bubble (or "locked" / "waiting" state)
- **History tab**: past questions as colored cards with date + both answers

**RN notes**:
- `TextInput` multiline for answer input
- Partner answer lock/unlock logic is pure data — works identically

### Todos (`/todos`)
**Data**:
- `useQuery(api.todos.list)` — all todos for the space
- `useMutation(api.todos.create)`
- `useMutation(api.todos.toggle)`
- `useMutation(api.todos.remove)`

**UI**:
- `BackHeader` with "Our little list" title
- Members avatar pair header card showing names + open/done counts
- Add-task row: pink + button + text input (Enter to submit)
- **"To do" section**: list of `TodoRow` components
- **"Done together" section**: completed todos (dimmed) with "Turn into memory →" chip
- `TodoRow`: checkbox circle + title + optional notes + category chip + due date chip + assignee chip
- Empty state

**Category chips** (5 types, each has emoji + label + tint color):
- `errand` → 🛒 Errand, yellow-soft
- `date` → 💕 Date, pink-soft
- `trip` → ✈️ Trip, blue-soft
- `read` → 📚 Read, green-soft
- `home` → 🏡 Home, cream

**RN notes**:
- "Turn into memory" → `router.push('/new?prefillTitle=...')`

### Settings (`/settings`)
**Data**:
- `useSpace()` — space (startDate), members (partner name), currentUser (email)
- `useMutation(api.spaces.updateStartDate)`
- `useAuthActions().signOut()`

**UI sections**:
- **Account**: email display (read-only)
- **Your relationship**: Anniversary date picker + Partner name (or "Invite" link)
- **Preferences**: Notifications toggle (stub), Appearance (stub), Language (stub)
- **Support**: "Report a bug" → mailto link
- Sign out button (red text, center)

### Invite Accept (`/invite/[code]`)
**Data**:
- `useQuery(api.invites.getByCode, { code })` — validates code, returns inviter info
- `useMutation(api.invites.accept)`

**UI**:
- Shows invite status: valid (inviter name + avatar) / used / expired / not found
- "Join their space" CTA → accepts invite → routes to home or onboarding/profile

---

## Shared component map

| Web component | React Native equivalent |
|---|---|
| `Card` | `View` with border, borderRadius, shadow, backgroundColor |
| `UserAvatar` | `Image` in circular `View` with border; initial fallback with `Text` |
| `BottomNav` | `Tab.Navigator` with custom `tabBar` prop |
| `BackHeader` | Custom `View` row with `TouchableOpacity` back button |
| `PhotoStack` | `Animated.View` stack with `PanGestureHandler` swipe |
| `PhotoLightbox` | `Modal` with `ScrollView` or `FlatList` |
| `Polaroid` | `View` with white border + rotation + shadow |
| `Tape` | `View` with semi-transparent background + rotation |
| `LocationSearch` | `react-native-google-places-autocomplete` |
| `AvatarGallery` | Grid of `TouchableOpacity` tiles + `expo-image-picker` |
| `ImageCropModal` | `react-native-image-crop-picker` or custom with `react-native-reanimated` |
| `PhotoPlaceholder` | Local image assets via `require()` |
| `InvitePartnerCard` | `View` card with copy/share buttons |

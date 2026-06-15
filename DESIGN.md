# Scrapbook — Design System

Everything needed to reproduce the visual language in React Native.

---

## Personality

Warm, cozy, handmade. Like a physical scrapbook — paper textures, slightly rotated photos, tape strips, soft shadows. Never clinical or corporate. Feels personal and intimate.

---

## Color palette

| Token | Hex | Usage |
|---|---|---|
| `cream` | `#FFF9EF` | Page/screen background |
| `paper` | `#F2E9D6` | Outer background (behind phone frame on web) |
| `coral` | `#F98592` | Primary accent, CTAs, active states, hearts |
| `pink` | `#F47D8E` | FAB button, primary buttons |
| `ink` | `#2F2A28` | Primary text |
| `brown` | `#6C5A4E` | Secondary text, icons, muted labels |
| `border` | `#E8DCCB` | Card borders, dividers, input borders |
| `blue` | `#CFE9FA` | Card tint (blue variant) |
| `yellow` | `#FFEAB6` | Card tint (yellow variant), tape |
| `green` | `#CFE8C9` | Card tint (green variant) |
| `pink-soft` | `#FCE4E7` | Card tint (pink variant), stat backgrounds |
| `blue-soft` | `#E5F2FB` | Stat background |
| `yellow-soft` | `#FFF3D1` | Stat background |
| `green-soft` | `#E2F0DD` | Stat background |

**RN usage**: Define these as a `colors` constant and reference everywhere — never hardcode hex strings in components.

```ts
// theme/colors.ts
export const colors = {
  cream: '#FFF9EF',
  paper: '#F2E9D6',
  coral: '#F98592',
  pink: '#F47D8E',
  ink: '#2F2A28',
  brown: '#6C5A4E',
  border: '#E8DCCB',
  blue: '#CFE9FA',
  yellow: '#FFEAB6',
  green: '#CFE8C9',
  pinkSoft: '#FCE4E7',
  blueSoft: '#E5F2FB',
  yellowSoft: '#FFF3D1',
  greenSoft: '#E2F0DD',
};
```

---

## Typography

Three fonts are used — load all three via `expo-font`.

| Role | Font | Google Fonts name | Usage |
|---|---|---|---|
| `hand` | Patrick Hand | `Patrick_Hand` | Default body, labels, UI text |
| `handwrite` / `script` | Caveat | `Caveat` (400, 600, 700) | Titles, display text, emotional copy |
| `cute` | Gaegu | `Gaegu` | Decorative captions |

**Size scale** (direct port from web — these are pixel values used throughout):

| Use | Size |
|---|---|
| Tiny label | 10–11 |
| Caption / meta | 12–13 |
| Body | 14–15 |
| Subheading | 16–17 |
| Heading | 18–20 |
| Large display | 22–28 |
| Hero (day counter) | 52 |

**Font weight**: Most text uses `fontWeight: '600'` (semibold) with the hand font. Caveat looks best at `700` for titles.

---

## Spacing & layout

- Screen horizontal padding: **20px** (`px-5`)
- Card internal padding: **16px** (`p-4`) standard, **20px** (`p-5`) for larger cards
- Gap between stacked sections: **20px** (`mt-5`)
- Corner radius scale: `8` (small), `12` (medium), `16` (large), `20–24` (cards/sheets)
- Bottom nav height: **~72px** — add safe area inset on top

---

## Shadows

Two shadow levels used:

```ts
// shadows.ts
export const shadows = {
  paper: {
    shadowColor: '#6C5A4E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    shadowColor: '#6C5A4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  fab: {
    shadowColor: '#F47D8E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
};
```

---

## Core components

### Card

Rounded rectangle with soft border and shadow. Has tint variants.

```
borderRadius: 24
borderWidth: 1
borderColor: colors.border
backgroundColor: colors.cream (white variant: #FFFFFF)
...shadows.card
```

Tint variants swap background only:
- `white` → `#FFFFFF`
- `blue` → `colors.blue`
- `yellow` → `colors.yellow`
- `pink` → `colors.pinkSoft`
- `green` → `colors.green`

### UserAvatar

Circular image with border and shadow. Falls back to colored initial.

```
borderRadius: size / 2
borderWidth: 2
borderColor: '#FFFFFF'
...shadows.paper
backgroundColor: one of four tints based on name.charCodeAt(0) % 4
  → ['#FCE4E7', '#E5F2FB', '#FFF3D1', '#E2F0DD']
```

If `avatarPreset` is set: load `/avatars/{preset}.png` from assets.
If `avatarStorageId` is set: use the resolved URL from Convex storage.
Fallback: show first letter of name in Caveat font, size * 0.42, color coral.

### BottomNav

5-column tab bar. Middle slot is a floating `+` FAB for new memories.

```
Tabs: Home, Journal, [+], Calendar, Profile
Background: white/95 with blur
Border radius: 28
Bottom margin: 12 + safe area inset
Shadow: 0 8 30 -12 rgba(108,90,78,0.35)
```

Active tab: coral, filled icon, strokeWidth 2.4
Inactive tab: brown/70, outline icon, strokeWidth 1.8
FAB: pink background, coral shadow ring, -36 top margin to float above bar

### BackHeader

Simple row: back chevron (left) + optional title (center) + optional trailing slot (right).
Height: ~44px. Background transparent.

### Bottom sheet

Slides up from bottom. Used for all editing overlays.

```
position: absolute, bottom: 0
borderTopLeftRadius: 24, borderTopRightRadius: 24
backgroundColor: colors.cream
paddingHorizontal: 20
paddingBottom: 40 + safe area inset
shadow: 0 -8 40 -8 rgba(108,90,78,0.2)
```

Always has a drag handle: `width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border` centered at top.
Backdrop: semi-transparent black with blur behind.

---

## Polaroid / photo style

Photos are displayed as polaroids — white border, slight rotation, tape strip at top.

```
borderWidth: 4
borderColor: '#FFFFFF'
borderRadius: 12
rotation: alternates between -2° and +3°
shadow: card shadow
```

Tape strip: semi-transparent yellow or pink rectangle, ~32×10px, rotated ~-8° or +6°, positioned at top center overlapping the photo edge.

---

## PhotoStack (tinder-card style)

Displays up to 3 photos stacked. Back cards peek out:
- Card 0 (front): no offset
- Card 1 (middle): y +9, rotate +3.5°, scale 0.97
- Card 2 (back): y +18, rotate -3.5°, scale 0.94

Swipe left/right threshold: 60px drag. Tap (< 6px drag) fires onTap.

---

## Animations & interactions

- All interactive elements: `active:scale-95` / `transform: scale(0.95)` on press
- Transitions: 150ms ease
- Loading skeletons: `animate-pulse` / interpolated opacity 1→0.4→1
- Spin: `animate-spin` for loaders
- No heavy animations — the app should feel responsive, not flashy

---

## Paper grain texture

The web version uses a CSS dot-grid background to simulate paper grain.
In React Native, approximate this with a very light pattern or skip it — the color palette alone carries the paper feel.

---

## Avatar presets

8 illustrated SVG avatars: `a01` through `a08`.
Store as local assets in `assets/avatars/`. Display as circular images.

---

## Decoration components (SVG illustrations)

Small SVG illustrations used throughout the app as accent elements. Exported from `components/decorations/`.

| Name | Usage |
|---|---|
| `Sun` | Memory date rows, weekday display |
| `Sparkle` | Page headers, empty states |
| `HeartTiny` | Memory metadata, couple separator |
| `Cloud` | Daily question page, empty states |
| `Sprout` | Calendar page decoration |
| `Heart` | Onboarding submit button |

In RN: convert these to inline SVGs using `react-native-svg`.

---

## Scene illustrations (PhotoPlaceholder)

When a memory has no photo, show one of 6 scene illustrations:
`coffee`, `couple`, `sunset`, `flowers`, `airplane`, `river`

Store as local assets in `assets/scenes/`. Assign randomly at memory creation time.

---

## React Native project setup checklist

### Packages
```
expo-font                        # load Patrick Hand, Caveat, Gaegu
expo-image-picker                # photo selection
expo-av                          # audio recording + playback
expo-file-system                 # file access for uploads
expo-media-library               # save photos to camera roll
expo-sharing                     # share files
expo-clipboard                   # copy to clipboard
expo-location                    # location services (optional)
react-native-safe-area-context   # safe area insets
react-native-gesture-handler     # swipe gestures (PhotoStack)
react-native-reanimated          # animations
@gorhom/bottom-sheet             # bottom sheets
react-native-svg                 # SVG illustrations
react-native-google-places-autocomplete  # location search
lucide-react-native              # icons (same names as lucide-react)
convex                           # same package
@convex-dev/auth                 # same package
```

### Font loading
```ts
// app/_layout.tsx
import { useFonts } from 'expo-font';

const [loaded] = useFonts({
  'PatrickHand': require('../assets/fonts/PatrickHand-Regular.ttf'),
  'Caveat-Regular': require('../assets/fonts/Caveat-Regular.ttf'),
  'Caveat-SemiBold': require('../assets/fonts/Caveat-SemiBold.ttf'),
  'Caveat-Bold': require('../assets/fonts/Caveat-Bold.ttf'),
  'Gaegu': require('../assets/fonts/Gaegu-Regular.ttf'),
});
```

Download fonts from Google Fonts and place in `assets/fonts/`.

### Global text style
Set a default `fontFamily` on all `Text` components via a custom wrapper or theme context so `PatrickHand` is the default — matching the web app's `font-family: var(--font-hand)` on `html, body`.

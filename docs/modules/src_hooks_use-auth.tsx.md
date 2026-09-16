# Module: `src/hooks/use-auth.tsx`

- **Language:** TypeScript
- **Total Lines:** 595
- **Direct Dependencies:** 8 modules imported

## Exported Symbols & API

### `FUNCTION` `getSydneyDateString`

- **Line:** 30

---

### `VARIABLE` `options`

- **Line:** 31

---

### `VARIABLE` `formatter`

- **Line:** 32

---

### `FUNCTION` `getSessionId`

- **Line:** 36

---

### `VARIABLE` `sessionId`

- **Line:** 38

---

### `FUNCTION` `trackDailyLogin`

- **Line:** 46
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `string` | **Yes** | - | - |
| `email` | `string` | **Yes** | - | - |
| `displayName` | `string` | **Yes** | - | - |
| `userRole` | `string` | No | - | - |

---

### `VARIABLE` `dateStr`

- **Line:** 48

---

### `VARIABLE` `sessionId`

- **Line:** 49

---

### `VARIABLE` `docId`

- **Line:** 50

---

### `VARIABLE` `loginDocRef`

- **Line:** 51

---

### `VARIABLE` `existingLoginDoc`

- **Line:** 53

---

### `VARIABLE` `userDocRef`

- **Line:** 54

---

### `VARIABLE` `userDoc`

- **Line:** 55

---

### `VARIABLE` `userData`

- **Line:** 57

---

### `VARIABLE` `isFirstLoginToday`

- **Line:** 58

---

### `VARIABLE` `roleToSave`

- **Line:** 59

---

### `VARIABLE` `profileUpdate`

- **Line:** 87
- **Signature:** `Record<string, any>`

---

### `INTERFACE` `AuthContextType`

- **Line:** 102

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `user` | `User | null` | No | - |
| `userProfile` | `UserProfile | null` | No | - |
| `savedRoutes` | `SavedRoute[]` | No | - |
| `setSavedRoutes` | `React.Dispatch<React.SetStateAction<SavedRoute[]>>` | No | - |
| `loading` | `boolean` | No | - |
| `isSigningIn` | `boolean` | No | - |
| `isSigningOut` | `boolean` | No | - |
| `isSwitchingFranchisee` | `boolean` | No | - |
| `signIn` | `(email: string, pass: string) => Promise<any>` | No | - |
| `signOut` | `() => Promise<void>` | No | - |
| `sendPasswordReset` | `(email: string) => Promise<void>` | No | - |
| `signUpAndCreateProfile` | `(userData: any) => Promise<string | void>` | No | - |
| `refreshToken` | `() => Promise<string | null>` | No | - |
| `switchRole` | `(newRole: UserRole) => void` | No | - |
| `switchFranchisee` | `(franchiseeId: string) => Promise<void>` | No | - |
| `completeOnboardingState` | `(routeKey: string) => Promise<void>` | No | - |
| `updateUserProfile` | `(updates: Partial<UserProfile>) => Promise<void>` | No | - |
| `isSuperAdmin` | `boolean` | No | - |

---

### `VARIABLE` `AuthContext`

- **Line:** 123

---

### `FUNCTION` `AuthProvider`

- **Line:** 144

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ children }` | `{ children: ReactNode }` | **Yes** | - | - |

---

### `VARIABLE` `router`

- **Line:** 153

---

### `VARIABLE` `pathname`

- **Line:** 154

---

### `VARIABLE` `authInstance`

- **Line:** 158

---

### `VARIABLE` `unsubscribe`

- **Line:** 161

---

### `VARIABLE` `userDocRef`

- **Line:** 164

---

### `VARIABLE` `userDoc`

- **Line:** 165

---

### `VARIABLE` `profileData`

- **Line:** 167

---

### `VARIABLE` `displayName`

- **Line:** 178

---

### `VARIABLE` `fullProfile`

- **Line:** 179
- **Signature:** `UserProfile`

---

### `VARIABLE` `savedRole`

- **Line:** 184

---

### `VARIABLE` `validRole`

- **Line:** 185

---

### `VARIABLE` `savedFranId`

- **Line:** 189

---

### `VARIABLE` `activeFran`

- **Line:** 190

---

### `FUNCTION` `runTracking`

- **Line:** 207

---

### `FUNCTION` `handleVisibilityChange`

- **Line:** 209

---

### `VARIABLE` `routes`

- **Line:** 221

---

### `VARIABLE` `signIn`

- **Line:** 274

---

### `VARIABLE` `userCredential`

- **Line:** 278

---

### `VARIABLE` `loggedInUser`

- **Line:** 279

---

### `VARIABLE` `userDocRef`

- **Line:** 281

---

### `VARIABLE` `userDoc`

- **Line:** 282

---

### `VARIABLE` `profileData`

- **Line:** 284

---

### `VARIABLE` `displayName`

- **Line:** 291

---

### `VARIABLE` `fullProfile`

- **Line:** 292
- **Signature:** `UserProfile`

---

### `VARIABLE` `today`

- **Line:** 295

---

### `VARIABLE` `signOut`

- **Line:** 312

---

### `VARIABLE` `sendPasswordReset`

- **Line:** 331

---

### `VARIABLE` `res`

- **Line:** 333

---

### `VARIABLE` `data`

- **Line:** 339

---

### `VARIABLE` `origin`

- **Line:** 347

---

### `VARIABLE` `actionCodeSettings`

- **Line:** 348

---

### `VARIABLE` `signUpAndCreateProfile`

- **Line:** 355

---

### `VARIABLE` `originalUser`

- **Line:** 358

---

### `VARIABLE` `userCredential`

- **Line:** 361

---

### `VARIABLE` `newUser`

- **Line:** 362

---

### `VARIABLE` `displayName`

- **Line:** 363

---

### `VARIABLE` `franchiseeIdVal`

- **Line:** 367

---

### `VARIABLE` `franchiseeRoleVal`

- **Line:** 368

---

### `VARIABLE` `linkedFrans`

- **Line:** 370
- **Signature:** `Array<{ franchiseeId: string; franchiseeName: string; relationship: 'owner' | 'investor'; isDefault?: boolean }>`

---

### `VARIABLE` `userProfileData`

- **Line:** 380
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `franRef`

- **Line:** 413

---

### `VARIABLE` `franSnap`

- **Line:** 414

---

### `VARIABLE` `existingData`

- **Line:** 416

---

### `VARIABLE` `existingUserIds`

- **Line:** 417
- **Signature:** `string[]`

---

### `VARIABLE` `updatedUserIds`

- **Line:** 418

---

### `VARIABLE` `userDetailObj`

- **Line:** 420

---

### `VARIABLE` `existingLinked`

- **Line:** 431
- **Signature:** `any[]`

---

### `VARIABLE` `filteredLinked`

- **Line:** 432

---

### `VARIABLE` `existingOwners`

- **Line:** 435
- **Signature:** `any[]`

---

### `VARIABLE` `filteredOwners`

- **Line:** 436

---

### `VARIABLE` `existingInvestors`

- **Line:** 439
- **Signature:** `any[]`

---

### `VARIABLE` `filteredInvestors`

- **Line:** 440

---

### `VARIABLE` `updatePayload`

- **Line:** 443
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `refreshToken`

- **Line:** 478

---

### `VARIABLE` `switchRole`

- **Line:** 483

---

### `VARIABLE` `userDocRef`

- **Line:** 490

---

### `VARIABLE` `switchFranchisee`

- **Line:** 497

---

### `VARIABLE` `target`

- **Line:** 499

---

### `VARIABLE` `currentFranId`

- **Line:** 501

---

### `VARIABLE` `updates`

- **Line:** 506
- **Signature:** `Partial<UserProfile>`

---

### `VARIABLE` `userDocRef`

- **Line:** 518

---

### `VARIABLE` `completeOnboardingState`

- **Line:** 529

---

### `VARIABLE` `updatedStates`

- **Line:** 531

---

### `VARIABLE` `userDocRef`

- **Line:** 532

---

### `VARIABLE` `updateUserProfile`

- **Line:** 538

---

### `VARIABLE` `userDocRef`

- **Line:** 540

---

### `FUNCTION` `handleActivity`

- **Line:** 549

---

### `FUNCTION` `handleVisibilityChange`

- **Line:** 554

---

### `VARIABLE` `value`

- **Line:** 568

---

### `FUNCTION` `useAuth`

- **Line:** 592

---


# Module: `src/app/app-layout.tsx`

- **Language:** TypeScript
- **Total Lines:** 2743
- **Direct Dependencies:** 29 modules imported

## Exported Symbols & API

### `FUNCTION` `AppLayout`

- **Line:** 62
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ children }` | `{ children: React.ReactNode }` | **Yes** | - | - |

---

### `VARIABLE` `pathname`

- **Line:** 63

---

### `VARIABLE` `router`

- **Line:** 64

---

### `VARIABLE` `containerRef`

- **Line:** 73

---

### `VARIABLE` `start`

- **Line:** 85

---

### `VARIABLE` `completed`

- **Line:** 86

---

### `VARIABLE` `timeoutId`

- **Line:** 87
- **Signature:** `NodeJS.Timeout`

---

### `FUNCTION` `checkLoadingState`

- **Line:** 89

---

### `VARIABLE` `container`

- **Line:** 92

---

### `VARIABLE` `hasLoader`

- **Line:** 96

---

### `VARIABLE` `duration`

- **Line:** 106

---

### `VARIABLE` `observer`

- **Line:** 121

---

### `VARIABLE` `container`

- **Line:** 125

---

### `VARIABLE` `safetyTimeout`

- **Line:** 135

---

### `FUNCTION` `formatTime`

- **Line:** 149

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `seconds` | `number` | **Yes** | - | - |

---

### `VARIABLE` `hrs`

- **Line:** 150

---

### `VARIABLE` `mins`

- **Line:** 151

---

### `VARIABLE` `secs`

- **Line:** 152

---

### `FUNCTION` `getActiveGroupForPath`

- **Line:** 165
- **Returns:** `string | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `path` | `string` | **Yes** | - | - |

---

### `FUNCTION` `isGroupCollapsed`

- **Line:** 204
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `groupId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `activeGroup`

- **Line:** 208

---

### `FUNCTION` `toggleGroup`

- **Line:** 215

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `groupId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `isCurrentlyCollapsed`

- **Line:** 217

---

### `VARIABLE` `newState`

- **Line:** 218

---

### `VARIABLE` `DEFAULT_PINNED`

- **Line:** 226
- **Signature:** `string[]`

---

### `VARIABLE` `userId`

- **Line:** 236

---

### `VARIABLE` `userPins`

- **Line:** 237

---

### `VARIABLE` `saved`

- **Line:** 249

---

### `FUNCTION` `togglePinItem`

- **Line:** 260

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `href` | `string` | **Yes** | - | - |

---

### `VARIABLE` `userId`

- **Line:** 262

---

### `VARIABLE` `updated`

- **Line:** 265
- **Signature:** `string[]`

---

### `VARIABLE` `PINNABLE_ITEMS`

- **Line:** 286
- **Signature:** `Record<string, { label: string; category: string; icon: React.ElementType; href: string }>`

---

### `FUNCTION` `toggleExpand`

- **Line:** 389

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `string` | **Yes** | - | - |

---

### `FUNCTION` `isActive`

- **Line:** 435

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `path` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleSignOut`

- **Line:** 444
- **Async:** Yes

---

### `FUNCTION` `handlePasswordReset`

- **Line:** 448
- **Async:** Yes

---

### `VARIABLE` `isAuthPage`

- **Line:** 476

---

### `FUNCTION` `checkDeploymentAndSession`

- **Line:** 494
- **Async:** Yes

---

### `VARIABLE` `sessionInitTime`

- **Line:** 503

---

### `VARIABLE` `forceLogoutDate`

- **Line:** 510

---

### `VARIABLE` `sessionDate`

- **Line:** 511

---

### `VARIABLE` `today`

- **Line:** 523

---

### `VARIABLE` `lastSessionDay`

- **Line:** 524

---

### `VARIABLE` `isFieldSales`

- **Line:** 538

---

### `VARIABLE` `deployment`

- **Line:** 540

---

### `VARIABLE` `skippedDate`

- **Line:** 544

---

### `FUNCTION` `handleVisibilityChange`

- **Line:** 557

---

### `VARIABLE` `INACTIVITY_TIMEOUT`

- **Line:** 575

---

### `VARIABLE` `checkInterval`

- **Line:** 576
- **Signature:** `NodeJS.Timeout`

---

### `VARIABLE` `lastUpdate`

- **Line:** 577

---

### `FUNCTION` `getLastActivity`

- **Line:** 579

---

### `VARIABLE` `stored`

- **Line:** 580

---

### `FUNCTION` `updateActivity`

- **Line:** 584

---

### `VARIABLE` `now`

- **Line:** 585

---

### `FUNCTION` `checkInactivity`

- **Line:** 593
- **Async:** Yes

---

### `VARIABLE` `lastActivity`

- **Line:** 594

---

### `VARIABLE` `now`

- **Line:** 595

---

### `VARIABLE` `activityEvents`

- **Line:** 608

---

### `FUNCTION` `handleVisibilityChange`

- **Line:** 617

---

### `FUNCTION` `formatAustralianPhoneNumber`

- **Line:** 633

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `VARIABLE` `digits`

- **Line:** 635

---

### `VARIABLE` `localPart`

- **Line:** 637

---

### `VARIABLE` `localPart`

- **Line:** 643

---

### `FUNCTION` `handleCalendlyClick`

- **Line:** 650

---

### `VARIABLE` `rep`

- **Line:** 652

---

### `VARIABLE` `url`

- **Line:** 654

---

### `VARIABLE` `canViewD2D`

- **Line:** 695

---

### `VARIABLE` `canViewReporting`

- **Line:** 696

---

### `VARIABLE` `canViewHistory`

- **Line:** 697

---

### `VARIABLE` `canCreateLead`

- **Line:** 698

---

### `VARIABLE` `canCaptureVisit`

- **Line:** 699

---

### `VARIABLE` `canProcessVisits`

- **Line:** 700

---

### `VARIABLE` `canViewVisits`

- **Line:** 701

---

### `VARIABLE` `canViewInbound`

- **Line:** 702

---

### `VARIABLE` `canViewInboundReporting`

- **Line:** 703

---

### `VARIABLE` `canViewMultiSiteReporting`

- **Line:** 704

---

### `VARIABLE` `canViewMarketingGroup`

- **Line:** 707

---

### `VARIABLE` `canViewFieldSalesD2D`

- **Line:** 708

---

### `VARIABLE` `allowedRoutePlannerRoles`

- **Line:** 709

---

### `VARIABLE` `canViewFieldSalesMap`

- **Line:** 710

---

### `VARIABLE` `canViewFieldSalesGroup`

- **Line:** 711

---

### `VARIABLE` `canViewLeadManagementOutbound`

- **Line:** 712

---

### `VARIABLE` `canViewLeadManagementArchive`

- **Line:** 713

---

### `VARIABLE` `isUserRole`

- **Line:** 714

---

### `VARIABLE` `canImportLeads`

- **Line:** 715

---

### `VARIABLE` `isFranchiseeRole`

- **Line:** 716

---

### `VARIABLE` `canViewFranchiseeVerification`

- **Line:** 717

---

### `VARIABLE` `canViewHistoryAppointments`

- **Line:** 718

---

### `VARIABLE` `canViewHistoryCallsTranscripts`

- **Line:** 719

---

### `VARIABLE` `activeRoleLower`

- **Line:** 720

---

### `VARIABLE` `isOperationsRole`

- **Line:** 721

---

### `VARIABLE` `canViewTerritoryMap`

- **Line:** 722

---

### `VARIABLE` `canViewFranchisees`

- **Line:** 726

---

### `VARIABLE` `canViewAccountManagerPipeline`

- **Line:** 727

---

### `VARIABLE` `canViewMultisite`

- **Line:** 728

---

### `VARIABLE` `canViewCustomerSuccessPipeline`

- **Line:** 729

---

### `VARIABLE` `canViewCustomerSuccessOnboarding`

- **Line:** 730

---

### `VARIABLE` `canViewScans`

- **Line:** 731

---

### `VARIABLE` `canViewCancellationReporting`

- **Line:** 732

---

### `VARIABLE` `canViewPostHogReporting`

- **Line:** 733

---

### `VARIABLE` `canViewTickets`

- **Line:** 734

---

### `VARIABLE` `canViewLpoLeads`

- **Line:** 735

---

### `VARIABLE` `canAccessAsk`

- **Line:** 736

---

### `VARIABLE` `activeRoleStr`

- **Line:** 737

---

### `VARIABLE` `isAleynaUser`

- **Line:** 738

---

### `VARIABLE` `canViewAleynaTraining`

- **Line:** 739

---

### `VARIABLE` `canViewFranchiseProspects`

- **Line:** 740

---

### `VARIABLE` `isAdmin`

- **Line:** 741

---

### `VARIABLE` `isMarketingAdmin`

- **Line:** 742

---

### `VARIABLE` `canViewInReviewLeads`

- **Line:** 743

---

### `VARIABLE` `canViewMasterLeadsDirectory`

- **Line:** 744

---

### `VARIABLE` `canViewLeadManagementGroup`

- **Line:** 745

---

### `VARIABLE` `allowedMailboxRoles`

- **Line:** 747

---

### `VARIABLE` `canAccessMailbox`

- **Line:** 756

---

### `VARIABLE` `canViewCustomers`

- **Line:** 759

---

### `VARIABLE` `canViewAnalyticsReportsGroup`

- **Line:** 760

---

### `VARIABLE` `item`

- **Line:** 1160

---

### `VARIABLE` `ItemIcon`

- **Line:** 1162

---

### `VARIABLE` `isPinned`

- **Line:** 2641

---

### `VARIABLE` `ItemIcon`

- **Line:** 2642

---

### `FUNCTION` `isBlockedForUserRole`

- **Line:** 2677

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `path` | `string` | **Yes** | - | - |
| `role` | `string` | No | - | - |

---

### `VARIABLE` `isFranchisee`

- **Line:** 2678

---

### `VARIABLE` `blockedFranchiseePaths`

- **Line:** 2683

---

### `VARIABLE` `CUSTOM_TIMER_PATHS`

- **Line:** 2708

---

### `FUNCTION` `isCustomPath`

- **Line:** 2721

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `path` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getPageNameFromPath`

- **Line:** 2726

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `path` | `string` | **Yes** | - | - |

---

### `VARIABLE` `segment`

- **Line:** 2739

---


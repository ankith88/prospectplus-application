# Module: `src/components/posthog-reporting-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 1132
- **Direct Dependencies:** 15 modules imported

## Exported Symbols & API

### `VARIABLE` `DEFAULT_POSTHOG_EMBED_URL`

- **Line:** 35

---

### `VARIABLE` `DEFAULT_POSTHOG_WEB_ANALYTICS_URL`

- **Line:** 36

---

### `FUNCTION` `parsePostHogUrl`

- **Line:** 38
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `input` | `string` | **Yes** | - | - |

---

### `VARIABLE` `url`

- **Line:** 39

---

### `VARIABLE` `srcMatch`

- **Line:** 43

---

### `FUNCTION` `applyDateRangeToUrl`

- **Line:** 56
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | `string` | **Yes** | - | - |
| `dateRange` | `string` | **Yes** | - | - |

---

### `VARIABLE` `urlObj`

- **Line:** 59

---

### `VARIABLE` `separator`

- **Line:** 63

---

### `FUNCTION` `PostHogReportingClient`

- **Line:** 68
- **Returns:** `void`

---

### `VARIABLE` `saved`

- **Line:** 90

---

### `VARIABLE` `defaultUrl`

- **Line:** 91

---

### `VARIABLE` `initial`

- **Line:** 93

---

### `VARIABLE` `savedWeb`

- **Line:** 97

---

### `VARIABLE` `initialWeb`

- **Line:** 98

---

### `VARIABLE` `activeRoleLower`

- **Line:** 104

---

### `VARIABLE` `isSuperAdmin`

- **Line:** 105

---

### `VARIABLE` `isAuthorized`

- **Line:** 106

---

### `FUNCTION` `fetchAttributionLeads`

- **Line:** 112
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `leadMap`

- **Line:** 115

---

### `FUNCTION` `processDoc`

- **Line:** 117

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `docSnap` | `any` | **Yes** | - | - |

---

### `VARIABLE` `data`

- **Line:** 118

---

### `VARIABLE` `leadsRef`

- **Line:** 153

---

### `VARIABLE` `compRef`

- **Line:** 154

---

### `VARIABLE` `generalLeads`

- **Line:** 177

---

### `FUNCTION` `handleSaveEmbedUrl`

- **Line:** 209

---

### `VARIABLE` `parsed`

- **Line:** 210

---

### `VARIABLE` `parsedWeb`

- **Line:** 219

---

### `FUNCTION` `handleResetEmbedUrl`

- **Line:** 231

---

### `VARIABLE` `defaultUrl`

- **Line:** 232

---

### `VARIABLE` `parsed`

- **Line:** 234

---

### `VARIABLE` `defaultWeb`

- **Line:** 238

---

### `VARIABLE` `isStandardProjectUrl`

- **Line:** 248

---

### `VARIABLE` `isWebAnalyticsStandardUrl`

- **Line:** 254

---

### `VARIABLE` `attributionLeads`

- **Line:** 273

---

### `VARIABLE` `filteredLeads`

- **Line:** 283

---

### `VARIABLE` `channel`

- **Line:** 285

---

### `VARIABLE` `channelCounts`

- **Line:** 290
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `ch`

- **Line:** 292

---

### `VARIABLE` `sortedChannels`

- **Line:** 296

---

### `VARIABLE` `topChannel`

- **Line:** 297

---

### `VARIABLE` `topChannelCount`

- **Line:** 298

---

### `VARIABLE` `sessionReplaysCount`

- **Line:** 300

---

### `VARIABLE` `sessionUrl`

- **Line:** 863

---

### `VARIABLE` `channel`

- **Line:** 870

---

### `VARIABLE` `landingPage`

- **Line:** 875

---

### `VARIABLE` `channel`

- **Line:** 1054

---

### `VARIABLE` `campaignName`

- **Line:** 1055

---

### `VARIABLE` `utmSource`

- **Line:** 1060

---

### `VARIABLE` `utmMedium`

- **Line:** 1061

---

### `VARIABLE` `utmContent`

- **Line:** 1062

---

### `VARIABLE` `landingPage`

- **Line:** 1063

---

### `VARIABLE` `sessionUrl`

- **Line:** 1064

---


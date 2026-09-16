# Module: `src/lib/ask/query-spec.ts`

- **Language:** TypeScript
- **Total Lines:** 352
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `VARIABLE` `ALLOWED_COLLECTIONS`

- **Line:** 3

---

### `VARIABLE` `COLLECTION_FIELDS`

- **Line:** 10

---

### `VARIABLE` `FilterOpSchema`

- **Line:** 94

---

### `VARIABLE` `FilterSchema`

- **Line:** 98

---

### `VARIABLE` `QuerySpecSchema`

- **Line:** 104

---

### `TYPE` `QuerySpec`

- **Line:** 125
- **Signature:** `z.infer<typeof QuerySpecSchema>`

---

### `INTERFACE` `UserAiTrainingConfig`

- **Line:** 127

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `userId` | `string` | Yes | - |
| `customInstructions` | `string` | Yes | - |
| `defaultChartType` | `'bar' | 'pie' | 'table'` | Yes | - |
| `bookmarkedQueries` | `{
    id: string;
    label: string;
    queryText: string;
    icon?: string;
    createdAt?: string;
  }[]` | Yes | - |
| `customVocabulary` | `{
    phrase: string;
    meaning: string;
    targetCollection?: string;
  }[]` | Yes | - |
| `corrections` | `{
    id: string;
    question: string;
    correction: string;
    createdAt: string;
  }[]` | Yes | - |

---

### `INTERFACE` `AskChatMessage`

- **Line:** 151

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `sender` | `'user' | 'bot'` | No | - |
| `timestamp` | `string` | No | - |
| `text` | `string` | Yes | - |
| `result` | `{
    spec: QuerySpec;
    rows?: any[];
    columns?: string[];
    value?: any;
    chartType?: 'bar' | 'pie' | 'line' | 'table' | 'none';
    humanSummary: string;
    insights?: string;
    suggestedFollowUps?: string[];
    comparison?: {
      currentLabel: string;
      previousLabel: string;
      currentValue: number;
      previousValue: number;
      deltaPercentage: number;
      isPositive: boolean;
    };
  }` | Yes | - |
| `error` | `string` | Yes | - |
| `suggestions` | `string[]` | Yes | - |

---

### `INTERFACE` `AskChatSession`

- **Line:** 178

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `userId` | `string` | No | - |
| `title` | `string` | No | - |
| `createdAt` | `string` | No | - |
| `updatedAt` | `string` | No | - |
| `messageCount` | `number` | No | - |
| `lastMessageSnippet` | `string` | Yes | - |
| `messages` | `AskChatMessage[]` | No | - |

---

### `FUNCTION` `validateQuerySpec`

> Validates the spec against the allow-listed fields in code.
Throws an error or returns false if invalid.

- **Line:** 194
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `spec` | `QuerySpec` | **Yes** | - | - |

---

### `VARIABLE` `allowedFields`

- **Line:** 195

---

### `FUNCTION` `isQuerySpecSafe`

> Verifies if the query is safe by checking if it has a temporal or scoping filter
for the potentially large 'leads' collection.

- **Line:** 236
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `spec` | `QuerySpec` | **Yes** | - | - |

---

### `VARIABLE` `scopingFields`

- **Line:** 243

---

### `FUNCTION` `getSydneyDateBoundaries`

> Resolves date boundaries in Australia/Sydney timezone for filtering.

- **Line:** 267
- **Returns:** `{ from?: string; to?: string }`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `relativeRange` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getSydneyNow`

- **Line:** 269

---

### `VARIABLE` `formatter`

- **Line:** 270

---

### `VARIABLE` `now`

- **Line:** 278

---

### `FUNCTION` `startOfDay`

- **Line:** 279

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `copy`

- **Line:** 280

---

### `FUNCTION` `endOfDay`

- **Line:** 284

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `copy`

- **Line:** 285

---

### `VARIABLE` `yesterday`

- **Line:** 298

---

### `VARIABLE` `day`

- **Line:** 308

---

### `VARIABLE` `diff`

- **Line:** 309

---

### `VARIABLE` `monday`

- **Line:** 310

---

### `VARIABLE` `sunday`

- **Line:** 311

---

### `VARIABLE` `day`

- **Line:** 320

---

### `VARIABLE` `diff`

- **Line:** 321

---

### `VARIABLE` `monday`

- **Line:** 322

---

### `VARIABLE` `sunday`

- **Line:** 323

---

### `VARIABLE` `firstDay`

- **Line:** 332

---

### `VARIABLE` `lastDay`

- **Line:** 333

---

### `VARIABLE` `firstDay`

- **Line:** 341

---

### `VARIABLE` `lastDay`

- **Line:** 342

---


# Module: `src/components/marketing/template-builder.tsx`

- **Language:** TypeScript
- **Total Lines:** 1192
- **Direct Dependencies:** 19 modules imported

## Exported Symbols & API

### `INTERFACE` `Template`

- **Line:** 38

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | - |
| `name` | `string` | No | - |
| `subject` | `string` | No | - |
| `body` | `string` | No | - |
| `createdAt` | `string` | No | - |
| `updatedAt` | `string` | No | - |
| `createdBy` | `string` | Yes | - |
| `createdByRole` | `string` | Yes | - |
| `allowedEditRoles` | `string[]` | Yes | - |

---

### `FUNCTION` `TemplateBuilder`

- **Line:** 50
- **Returns:** `void`

---

### `FUNCTION` `canEditTemplate`

- **Line:** 64

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `template` | `Template | null` | **Yes** | - | - |

---

### `VARIABLE` `role`

- **Line:** 68

---

### `VARIABLE` `isOwner`

- **Line:** 69

---

### `VARIABLE` `isFullAdmin`

- **Line:** 70

---

### `VARIABLE` `userRoleLower`

- **Line:** 81

---

### `VARIABLE` `hasRolePermission`

- **Line:** 82

---

### `VARIABLE` `rLower`

- **Line:** 83

---

### `VARIABLE` `createdByAm`

- **Line:** 92

---

### `VARIABLE` `isEditable`

- **Line:** 100

---

### `VARIABLE` `bodyTextareaRef`

- **Line:** 115

---

### `VARIABLE` `subjectInputRef`

- **Line:** 116

---

### `FUNCTION` `handleSendTestEmail`

- **Line:** 124
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 144

---

### `VARIABLE` `result`

- **Line:** 154

---

### `FUNCTION` `handleGenerateAI`

- **Line:** 185
- **Async:** Yes

---

### `VARIABLE` `performanceHistory`

- **Line:** 197

---

### `VARIABLE` `result`

- **Line:** 199

---

### `FUNCTION` `fetchData`

- **Line:** 235
- **Async:** Yes

---

### `FUNCTION` `fetchCampaigns`

- **Line:** 246
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 248

---

### `VARIABLE` `list`

- **Line:** 249

---

### `FUNCTION` `fetchJourneys`

- **Line:** 259
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 261

---

### `VARIABLE` `list`

- **Line:** 262

---

### `FUNCTION` `fetchBrandProfile`

- **Line:** 272
- **Async:** Yes

---

### `VARIABLE` `docRef`

- **Line:** 274

---

### `VARIABLE` `docSnap`

- **Line:** 275

---

### `FUNCTION` `fetchTemplates`

- **Line:** 284
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 286

---

### `VARIABLE` `list`

- **Line:** 287

---

### `FUNCTION` `fetchSnippets`

- **Line:** 302
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 304

---

### `VARIABLE` `list`

- **Line:** 305

---

### `FUNCTION` `handleSelectTemplate`

- **Line:** 315

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `template` | `Template` | **Yes** | - | - |

---

### `VARIABLE` `roles`

- **Line:** 321

---

### `FUNCTION` `handleNewTemplate`

- **Line:** 332

---

### `FUNCTION` `insertContent`

- **Line:** 341

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `htmlContent` | `string` | **Yes** | - | - |

---

### `VARIABLE` `textarea`

- **Line:** 349

---

### `VARIABLE` `start`

- **Line:** 352

---

### `VARIABLE` `end`

- **Line:** 353

---

### `VARIABLE` `value`

- **Line:** 354

---

### `VARIABLE` `newValue`

- **Line:** 356

---

### `FUNCTION` `insertSubjectPlaceholder`

- **Line:** 365

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `placeholder` | `string` | **Yes** | - | - |

---

### `VARIABLE` `input`

- **Line:** 366

---

### `VARIABLE` `start`

- **Line:** 369

---

### `VARIABLE` `end`

- **Line:** 370

---

### `VARIABLE` `value`

- **Line:** 371

---

### `VARIABLE` `newValue`

- **Line:** 373

---

### `FUNCTION` `handleSave`

- **Line:** 382
- **Async:** Yes

---

### `VARIABLE` `now`

- **Line:** 402

---

### `VARIABLE` `rolesToSave`

- **Line:** 404
- **Signature:** `string[]`

---

### `VARIABLE` `data`

- **Line:** 411
- **Signature:** `any`

---

### `VARIABLE` `ref`

- **Line:** 420

---

### `VARIABLE` `docRef`

- **Line:** 426

---

### `FUNCTION` `handleDelete`

- **Line:** 446
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `e` | `React.MouseEvent` | **Yes** | - | - |

---

### `VARIABLE` `templateToDelete`

- **Line:** 448

---

### `FUNCTION` `handleDuplicate`

- **Line:** 476
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `template` | `Template` | **Yes** | - | - |
| `e` | `React.MouseEvent` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 480

---

### `VARIABLE` `data`

- **Line:** 482

---

### `VARIABLE` `primaryColor`

- **Line:** 510

---

### `VARIABLE` `fontFamily`

- **Line:** 511

---

### `VARIABLE` `logoUrl`

- **Line:** 512

---

### `VARIABLE` `banners`

- **Line:** 514

---

### `VARIABLE` `footers`

- **Line:** 515

---

### `VARIABLE` `filteredTemplates`

- **Line:** 518

---

### `VARIABLE` `q`

- **Line:** 520

---

### `VARIABLE` `nameMatch`

- **Line:** 521

---

### `VARIABLE` `subjectMatch`

- **Line:** 522

---

### `VARIABLE` `bodyMatch`

- **Line:** 523

---

### `VARIABLE` `camp`

- **Line:** 528

---

### `VARIABLE` `isDirect`

- **Line:** 530

---

### `VARIABLE` `isLinked`

- **Line:** 531

---

### `VARIABLE` `groupedData`

- **Line:** 651
- **Signature:** `{ campaignId: string; campaignName: string; templates: Template[] }[]`

---

### `VARIABLE` `campaignTemplates`

- **Line:** 654

---

### `VARIABLE` `linkedTemplateIds`

- **Line:** 664

---

### `VARIABLE` `unlinkedTemplates`

- **Line:** 668

---

### `FUNCTION` `toggleGroup`

- **Line:** 677

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `groupId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `isCollapsed`

- **Line:** 687

---

### `VARIABLE` `actionNodes`

- **Line:** 773

---

### `VARIABLE` `tag`

- **Line:** 779

---

### `VARIABLE` `rules`

- **Line:** 780
- **Signature:** `string[]`

---

### `VARIABLE` `isChecked`

- **Line:** 960

---


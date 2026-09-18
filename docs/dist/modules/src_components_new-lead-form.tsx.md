# Module: `src/components/new-lead-form.tsx`

- **Language:** TypeScript
- **Total Lines:** 1880
- **Direct Dependencies:** 31 modules imported

## Exported Symbols & API

### `VARIABLE` `abnRegex`

- **Line:** 57

---

### `FUNCTION` `isValidRealEmail`

- **Line:** 59

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `string | undefined | null` | **Yes** | - | - |

---

### `VARIABLE` `email`

- **Line:** 61

---

### `VARIABLE` `parts`

- **Line:** 63

---

### `VARIABLE` `forbidden`

- **Line:** 64

---

### `VARIABLE` `isUserPartInvalid`

- **Line:** 67

---

### `VARIABLE` `domainLabels`

- **Line:** 70

---

### `VARIABLE` `isDomainPartInvalid`

- **Line:** 71

---

### `VARIABLE` `formSchema`

- **Line:** 76

---

### `FUNCTION` `NewLeadForm`

- **Line:** 136
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 138

---

### `VARIABLE` `searchParams`

- **Line:** 139

---

### `VARIABLE` `recognitionRef`

- **Line:** 145

---

### `VARIABLE` `cardVideoRef`

- **Line:** 172

---

### `VARIABLE` `cardCanvasRef`

- **Line:** 173

---

### `FUNCTION` `getCameraPermission`

- **Line:** 183
- **Async:** Yes

---

### `VARIABLE` `stream`

- **Line:** 185

---

### `FUNCTION` `handleCaptureCardPhoto`

- **Line:** 210

---

### `VARIABLE` `canvas`

- **Line:** 212

---

### `VARIABLE` `context`

- **Line:** 215

---

### `FUNCTION` `handleRunCardAnalysis`

- **Line:** 220

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `frontImg` | `string | null` | **Yes** | - | - |
| `backImg` | `string | null` | **Yes** | - | - |

---

### `VARIABLE` `parts`

- **Line:** 236

---

### `VARIABLE` `sortedAllFranchisees`

- **Line:** 274

---

### `FUNCTION` `fetchUsersAndFranchisees`

- **Line:** 280
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `companySearchRef`

- **Line:** 293

---

### `VARIABLE` `companyAutocompleteRef`

- **Line:** 294

---

### `VARIABLE` `form`

- **Line:** 298

---

### `VARIABLE` `campaign`

- **Line:** 333

---

### `VARIABLE` `leadSource`

- **Line:** 334

---

### `VARIABLE` `droppedOffBrochures`

- **Line:** 335

---

### `VARIABLE` `hadConversationWithContact`

- **Line:** 336

---

### `VARIABLE` `addressState`

- **Line:** 337

---

### `VARIABLE` `companyNameState`

- **Line:** 338

---

### `VARIABLE` `isFranchiseeRole`

- **Line:** 339

---

### `VARIABLE` `isAddressSelected`

- **Line:** 341

---

### `VARIABLE` `hasMultipleFranchisees`

- **Line:** 348

---

### `VARIABLE` `requiresFranchiseeConfirmation`

- **Line:** 350

---

### `VARIABLE` `canShowRemainingSections`

- **Line:** 354

---

### `VARIABLE` `activeDialers`

- **Line:** 394

---

### `VARIABLE` `activeFieldReps`

- **Line:** 395

---

### `VARIABLE` `activeAccountManagers`

- **Line:** 396

---

### `VARIABLE` `city`

- **Line:** 400

---

### `VARIABLE` `state`

- **Line:** 401

---

### `VARIABLE` `zip`

- **Line:** 402

---

### `VARIABLE` `isFranchiseeRole`

- **Line:** 404

---

### `VARIABLE` `matches`

- **Line:** 410
- **Signature:** `import('@/lib/types').Franchisee[]`

---

### `VARIABLE` `reasons`

- **Line:** 411
- **Signature:** `Record<string, { inTerritory: boolean; inAusPost: boolean }>`

---

### `VARIABLE` `inTerritory`

- **Line:** 414

---

### `VARIABLE` `inAusPost`

- **Line:** 419

---

### `VARIABLE` `myFranchisee`

- **Line:** 434

---

### `VARIABLE` `canService`

- **Line:** 440

---

### `VARIABLE` `mailPlusObj`

- **Line:** 466

---

### `VARIABLE` `fillFormWithPlace`

- **Line:** 481

---

### `VARIABLE` `companyName`

- **Line:** 482

---

### `VARIABLE` `phoneNumber`

- **Line:** 483

---

### `VARIABLE` `websiteUrl`

- **Line:** 484

---

### `VARIABLE` `email`

- **Line:** 485

---

### `VARIABLE` `duplicateId`

- **Line:** 487

---

### `FUNCTION` `getAddressComponent`

- **Line:** 509

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |
| `useShortName` | `any` | No | `false` | - |

---

### `VARIABLE` `component`

- **Line:** 510

---

### `VARIABLE` `street_number`

- **Line:** 514

---

### `VARIABLE` `route`

- **Line:** 515

---

### `VARIABLE` `websiteDomain`

- **Line:** 527

---

### `VARIABLE` `email`

- **Line:** 529

---

### `VARIABLE` `place`

- **Line:** 541

---

### `VARIABLE` `visitNoteId`

- **Line:** 550

---

### `FUNCTION` `fetchAndPopulateVisitNote`

- **Line:** 552
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `noteId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `noteRef`

- **Line:** 555

---

### `VARIABLE` `noteSnap`

- **Line:** 556

---

### `VARIABLE` `note`

- **Line:** 559

---

### `VARIABLE` `companyName`

- **Line:** 567

---

### `VARIABLE` `repName`

- **Line:** 569

---

### `VARIABLE` `discovery`

- **Line:** 576

---

### `VARIABLE` `contactName`

- **Line:** 577

---

### `VARIABLE` `contactTitle`

- **Line:** 578

---

### `VARIABLE` `contactEmail`

- **Line:** 579

---

### `VARIABLE` `contactPhone`

- **Line:** 580

---

### `VARIABLE` `nameParts`

- **Line:** 595

---

### `VARIABLE` `email`

- **Line:** 596

---

### `VARIABLE` `phone`

- **Line:** 597

---

### `VARIABLE` `newDefaultValues`

- **Line:** 599

---

### `VARIABLE` `handleAiProspect`

- **Line:** 656

---

### `VARIABLE` `url`

- **Line:** 657

---

### `VARIABLE` `tempLeadId`

- **Line:** 664

---

### `VARIABLE` `result`

- **Line:** 665

---

### `VARIABLE` `primaryContact`

- **Line:** 668

---

### `VARIABLE` `nameParts`

- **Line:** 669

---

### `VARIABLE` `SpeechRecognition`

- **Line:** 691

---

### `VARIABLE` `recognition`

- **Line:** 697

---

### `VARIABLE` `finalTranscript`

- **Line:** 703

---

### `VARIABLE` `errorMessage`

- **Line:** 715

---

### `FUNCTION` `handleToggleListening`

- **Line:** 745

---

### `FUNCTION` `handleLinkToExistingLead`

- **Line:** 758
- **Async:** Yes

---

### `VARIABLE` `visitNoteId`

- **Line:** 759

---

### `VARIABLE` `leadRef`

- **Line:** 767

---

### `VARIABLE` `userRef`

- **Line:** 769

---

### `VARIABLE` `userSnap`

- **Line:** 770

---

### `VARIABLE` `capturer`

- **Line:** 771

---

### `VARIABLE` `updateData`

- **Line:** 773
- **Signature:** `any`

---

### `FUNCTION` `onSubmit`

- **Line:** 817
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof formSchema>` | **Yes** | - | - |
| `isAddAnother` | `boolean` | No | `false` | - |

---

### `VARIABLE` `isAnother`

- **Line:** 818

---

### `VARIABLE` `finalValues`

- **Line:** 820

---

### `VARIABLE` `visitNoteId`

- **Line:** 822

---

### `VARIABLE` `duplicateId`

- **Line:** 824

---

### `VARIABLE` `dialerForLead`

- **Line:** 836

---

### `VARIABLE` `isFranchiseeRole`

- **Line:** 853

---

### `VARIABLE` `droppedOffBrochures`

- **Line:** 854

---

### `VARIABLE` `hadConversationWithContact`

- **Line:** 855

---

### `VARIABLE` `isPriority`

- **Line:** 856

---

### `VARIABLE` `isMultisite`

- **Line:** 887

---

### `VARIABLE` `targetAmForMultisite`

- **Line:** 893

---

### `VARIABLE` `foundAm`

- **Line:** 895

---

### `VARIABLE` `amSnap`

- **Line:** 900

---

### `VARIABLE` `amData`

- **Line:** 902

---

### `VARIABLE` `isUserActiveDialer`

- **Line:** 914

---

### `VARIABLE` `validDefaultDialer`

- **Line:** 915

---

### `VARIABLE` `finalDialer`

- **Line:** 917

---

### `VARIABLE` `finalSalesRep`

- **Line:** 922

---

### `VARIABLE` `finalAccountManager`

- **Line:** 929

---

### `VARIABLE` `selectedFranchiseeObj`

- **Line:** 933

---

### `VARIABLE` `result`

- **Line:** 936

---

### `VARIABLE` `leadRef`

- **Line:** 957

---

### `VARIABLE` `assignmentUpdates`

- **Line:** 960
- **Signature:** `any`

---

### `VARIABLE` `addressStr`

- **Line:** 1029

---

### `VARIABLE` `fName`

- **Line:** 1030

---

### `VARIABLE` `leadRef`

- **Line:** 1073

---

### `VARIABLE` `userRef`

- **Line:** 1077

---

### `VARIABLE` `userSnap`

- **Line:** 1078

---

### `VARIABLE` `capturer`

- **Line:** 1079

---

### `VARIABLE` `updateData`

- **Line:** 1081
- **Signature:** `any`

---

### `VARIABLE` `leadRef`

- **Line:** 1110

---

### `VARIABLE` `extractedContacts`

- **Line:** 1116

---

### `VARIABLE` `addedCount`

- **Line:** 1120

---

### `VARIABLE` `formattedKey`

- **Line:** 1759

---

### `VARIABLE` `formattedValue`

- **Line:** 1760

---

### `VARIABLE` `img`

- **Line:** 1852

---

### `VARIABLE` `backImg`

- **Line:** 1863

---


# Module: `src/app/capture-visit/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 1565
- **Direct Dependencies:** 38 modules imported

## Exported Symbols & API

### `VARIABLE` `FieldDiscoveryStep`

- **Line:** 65

---

### `VARIABLE` `noteSchema`

- **Line:** 71

---

### `FUNCTION` `isValidRealEmail`

- **Line:** 75

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `string | undefined | null` | **Yes** | - | - |

---

### `VARIABLE` `email`

- **Line:** 77

---

### `VARIABLE` `parts`

- **Line:** 79

---

### `VARIABLE` `forbidden`

- **Line:** 80

---

### `VARIABLE` `isUserPartInvalid`

- **Line:** 83

---

### `VARIABLE` `domainLabels`

- **Line:** 86

---

### `VARIABLE` `isDomainPartInvalid`

- **Line:** 87

---

### `VARIABLE` `discoverySchema`

- **Line:** 92

---

### `FUNCTION` `parseAddressComponents`

- **Line:** 137
- **Returns:** `Address`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `components` | `google.maps.GeocoderAddressComponent[]` | **Yes** | - | - |

---

### `VARIABLE` `address`

- **Line:** 138
- **Signature:** `Partial<Address>`

---

### `FUNCTION` `get`

- **Line:** 139

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |
| `useShortName` | `any` | No | `false` | - |

---

### `VARIABLE` `comp`

- **Line:** 140

---

### `VARIABLE` `streetNumber`

- **Line:** 143

---

### `VARIABLE` `route`

- **Line:** 144

---

### `VARIABLE` `TOTAL_STEPS`

- **Line:** 154

---

### `VARIABLE` `stepLabels`

- **Line:** 155

---

### `FUNCTION` `ResponsiveProgress`

- **Line:** 157

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ currentStep, totalSteps, labels, onStepClick }` | `{ currentStep: number; totalSteps: number; labels: string[]; onStepClick: (step: number) => void; }` | **Yes** | - | - |

---

### `VARIABLE` `step`

- **Line:** 161

---

### `VARIABLE` `isCompleted`

- **Line:** 162

---

### `VARIABLE` `isCurrent`

- **Line:** 163

---

### `FUNCTION` `MandatoryFieldsForOutcome`

- **Line:** 192

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ hideSchedule = false }` | `{ hideSchedule?: boolean }` | **Yes** | - | - |

---

### `VARIABLE` `personName`

- **Line:** 195

---

### `VARIABLE` `personEmail`

- **Line:** 196

---

### `VARIABLE` `personPhone`

- **Line:** 197

---

### `VARIABLE` `dmName`

- **Line:** 199

---

### `VARIABLE` `dmEmail`

- **Line:** 200

---

### `VARIABLE` `dmPhone`

- **Line:** 201

---

### `VARIABLE` `dmTitle`

- **Line:** 202

---

### `VARIABLE` `hasDM`

- **Line:** 204

---

### `VARIABLE` `hasExistingInfo`

- **Line:** 205

---

### `FUNCTION` `handleUseDM`

- **Line:** 207

---

### `VARIABLE` `contactTagOptions`

- **Line:** 281
- **Signature:** `Option[]`

---

### `FUNCTION` `compressImage`

- **Line:** 287
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dataUrl` | `string` | **Yes** | - | - |
| `maxWidth` | `any` | No | `1024` | - |
| `quality` | `any` | No | `0.6` | - |

---

### `VARIABLE` `img`

- **Line:** 289

---

### `VARIABLE` `canvas`

- **Line:** 292

---

### `VARIABLE` `width`

- **Line:** 293

---

### `VARIABLE` `height`

- **Line:** 294

---

### `VARIABLE` `ctx`

- **Line:** 303

---

### `VARIABLE` `DRAFT_KEY`

- **Line:** 310

---

### `FUNCTION` `CaptureVisitContent`

- **Line:** 312
- **Returns:** `void`

---

### `VARIABLE` `recognitionRef`

- **Line:** 317

---

### `VARIABLE` `videoRef`

- **Line:** 326

---

### `VARIABLE` `canvasRef`

- **Line:** 327

---

### `VARIABLE` `autocompleteInstanceRef`

- **Line:** 338

---

### `VARIABLE` `router`

- **Line:** 342

---

### `VARIABLE` `searchParams`

- **Line:** 343

---

### `VARIABLE` `noteIdToEdit`

- **Line:** 344

---

### `VARIABLE` `captureForm`

- **Line:** 348

---

### `VARIABLE` `discoveryForm`

- **Line:** 353

---

### `VARIABLE` `watchedSignals`

- **Line:** 376

---

### `VARIABLE` `hasDiscoveryValues`

- **Line:** 377

---

### `VARIABLE` `isNoOpportunity`

- **Line:** 378

---

### `VARIABLE` `isAdminOrLeadGen`

- **Line:** 380

---

### `VARIABLE` `isFranchisee`

- **Line:** 381

---

### `VARIABLE` `currentStepNumber`

- **Line:** 384

---

### `VARIABLE` `searchInputCallbackRef`

- **Line:** 394

---

### `VARIABLE` `autocomplete`

- **Line:** 402

---

### `VARIABLE` `place`

- **Line:** 411
- **Signature:** `google.maps.places.PlaceResult | undefined`

---

### `VARIABLE` `draft`

- **Line:** 455

---

### `VARIABLE` `saveDraft`

- **Line:** 462

---

### `VARIABLE` `draftData`

- **Line:** 464

---

### `VARIABLE` `interval`

- **Line:** 477

---

### `FUNCTION` `handleRestoreDraft`

- **Line:** 481

---

### `VARIABLE` `draft`

- **Line:** 482

---

### `VARIABLE` `data`

- **Line:** 484

---

### `FUNCTION` `clearDraft`

- **Line:** 498

---

### `FUNCTION` `fetchNote`

- **Line:** 506
- **Async:** Yes

---

### `VARIABLE` `noteRef`

- **Line:** 508

---

### `VARIABLE` `noteSnap`

- **Line:** 509

---

### `VARIABLE` `noteData`

- **Line:** 511

---

### `VARIABLE` `restoredNotes`

- **Line:** 539
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `currentPathway`

- **Line:** 542

---

### `VARIABLE` `qMatch`

- **Line:** 544

---

### `VARIABLE` `fsUsers`

- **Line:** 580

---

### `VARIABLE` `resetState`

- **Line:** 586

---

### `FUNCTION` `getCameraPermission`

- **Line:** 617
- **Async:** Yes

---

### `VARIABLE` `stream`

- **Line:** 619

---

### `VARIABLE` `SpeechRecognition`

- **Line:** 644

---

### `VARIABLE` `recognition`

- **Line:** 647

---

### `VARIABLE` `finalTranscript`

- **Line:** 653

---

### `FUNCTION` `handleToggleListening`

- **Line:** 669

---

### `FUNCTION` `handleInputChange`

- **Line:** 682

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `value`

- **Line:** 683

---

### `FUNCTION` `handleImageUpload`

- **Line:** 691

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `files`

- **Line:** 693

---

### `VARIABLE` `reader`

- **Line:** 701

---

### `VARIABLE` `compressed`

- **Line:** 704

---

### `FUNCTION` `handleCaptureImage`

- **Line:** 720
- **Async:** Yes

---

### `VARIABLE` `canvas`

- **Line:** 722

---

### `VARIABLE` `context`

- **Line:** 725

---

### `VARIABLE` `dataUrl`

- **Line:** 727

---

### `VARIABLE` `compressed`

- **Line:** 729

---

### `FUNCTION` `handleDeleteImage`

- **Line:** 734

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `indexToDelete` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleFinalSubmit`

- **Line:** 738
- **Async:** Yes

---

### `VARIABLE` `captureUser`

- **Line:** 744

---

### `VARIABLE` `selectedUser`

- **Line:** 747

---

### `VARIABLE` `rawNote`

- **Line:** 775

---

### `VARIABLE` `addressData`

- **Line:** 777
- **Signature:** `Address | undefined`

---

### `VARIABLE` `discoveryValues`

- **Line:** 786

---

### `VARIABLE` `currentPathway`

- **Line:** 787

---

### `VARIABLE` `discoveryAnswers`

- **Line:** 790

---

### `VARIABLE` `questionLabel`

- **Line:** 791

---

### `VARIABLE` `scoredDiscoveryData`

- **Line:** 799

---

### `VARIABLE` `isDashbackNote`

- **Line:** 833

---

### `VARIABLE` `initialStatus`

- **Line:** 834

---

### `VARIABLE` `qualifiedOutcomes`

- **Line:** 838

---

### `VARIABLE` `discoveryAnswers`

- **Line:** 867

---

### `VARIABLE` `formattedKey`

- **Line:** 870

---

### `VARIABLE` `formattedValue`

- **Line:** 871

---

### `VARIABLE` `nsPayload`

- **Line:** 877

---

### `VARIABLE` `nsResult`

- **Line:** 884

---

### `FUNCTION` `validateProgression`

- **Line:** 905
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `targetStepNum` | `number` | **Yes** | - | - |
| `overrideOutcome` | `{ type: string; details: Record<string, any> }` | No | - | - |

---

### `VARIABLE` `lostPropertyProcess`

- **Line:** 908

---

### `VARIABLE` `currentOutcome`

- **Line:** 922

---

### `VARIABLE` `type`

- **Line:** 931

---

### `VARIABLE` `values`

- **Line:** 934

---

### `VARIABLE` `isPersonEmailValid`

- **Line:** 935

---

### `VARIABLE` `isDecisionEmailValid`

- **Line:** 936

---

### `VARIABLE` `isPersonComplete`

- **Line:** 938

---

### `VARIABLE` `isDecisionComplete`

- **Line:** 939

---

### `VARIABLE` `errorMsg`

- **Line:** 942

---

### `VARIABLE` `pathwayId`

- **Line:** 961

---

### `VARIABLE` `pathway`

- **Line:** 966

---

### `VARIABLE` `allQuestionsAnswered`

- **Line:** 967

---

### `VARIABLE` `values`

- **Line:** 976

---

### `VARIABLE` `isPersonEmailValid`

- **Line:** 977

---

### `VARIABLE` `isDecisionEmailValid`

- **Line:** 978

---

### `VARIABLE` `isPersonComplete`

- **Line:** 980

---

### `VARIABLE` `isDecisionComplete`

- **Line:** 981

---

### `VARIABLE` `pathwayId`

- **Line:** 999

---

### `VARIABLE` `pathway`

- **Line:** 1004

---

### `VARIABLE` `allQuestionsAnswered`

- **Line:** 1005

---

### `VARIABLE` `currentNote`

- **Line:** 1014

---

### `FUNCTION` `handleNextStep`

- **Line:** 1029
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `manualOutcome` | `{ type: string; details: Record<string, any> }` | No | - | - |

---

### `VARIABLE` `nextStepNum`

- **Line:** 1030

---

### `VARIABLE` `isValid`

- **Line:** 1031

---

### `FUNCTION` `handlePreviousStep`

- **Line:** 1048

---

### `FUNCTION` `handleStepClick`

- **Line:** 1059
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `stepNumber` | `number` | **Yes** | - | - |

---

### `VARIABLE` `canMove`

- **Line:** 1070

---

### `VARIABLE` `details`

- **Line:** 1390
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `details`

- **Line:** 1427
- **Signature:** `Record<string, any>`

---

### `FUNCTION` `CaptureVisitPage`

- **Line:** 1559
- **Returns:** `void`

---


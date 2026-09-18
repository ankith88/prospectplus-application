# Module: `src/components/ui/rich-text-editor.tsx`

- **Language:** TypeScript
- **Total Lines:** 268
- **Direct Dependencies:** 10 modules imported

## Exported Symbols & API

### `INTERFACE` `RichTextEditorProps`

- **Line:** 27

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `value` | `string` | No | - |
| `onChange` | `(value: string) => void` | No | - |
| `className` | `string` | Yes | - |
| `onFocus` | `() => void` | Yes | - |
| `editorClassName` | `string` | Yes | - |
| `style` | `React.CSSProperties` | Yes | - |

---

### `FUNCTION` `MenuBar`

- **Line:** 36

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ editor }` | `{ editor: Editor | null }` | **Yes** | - | - |

---

### `FUNCTION` `addLink`

- **Line:** 41

---

### `VARIABLE` `previousUrl`

- **Line:** 42

---

### `VARIABLE` `url`

- **Line:** 43

---

### `FUNCTION` `RichTextEditor`

- **Line:** 191
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ value, onChange, className, onFocus, editorClassName, style }` | `RichTextEditorProps` | **Yes** | - | - |

---

### `VARIABLE` `editor`

- **Line:** 192

---


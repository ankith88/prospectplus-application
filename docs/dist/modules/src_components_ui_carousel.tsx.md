# Module: `src/components/ui/carousel.tsx`

- **Language:** TypeScript
- **Total Lines:** 263
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `TYPE` `CarouselApi`

- **Line:** 12
- **Signature:** `UseEmblaCarouselType[1]`

---

### `TYPE` `UseCarouselParameters`

- **Line:** 13
- **Signature:** `Parameters<typeof useEmblaCarousel>`

---

### `TYPE` `CarouselOptions`

- **Line:** 14
- **Signature:** `UseCarouselParameters[0]`

---

### `TYPE` `CarouselPlugin`

- **Line:** 15
- **Signature:** `UseCarouselParameters[1]`

---

### `TYPE` `CarouselProps`

- **Line:** 17
- **Signature:** `{
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}`

---

### `TYPE` `CarouselContextProps`

- **Line:** 24
- **Signature:** `{
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps`

---

### `VARIABLE` `CarouselContext`

- **Line:** 33

---

### `FUNCTION` `useCarousel`

- **Line:** 35
- **Returns:** `void`

---

### `VARIABLE` `context`

- **Line:** 36

---

### `VARIABLE` `Carousel`

- **Line:** 45

---

### `VARIABLE` `onSelect`

- **Line:** 71

---

### `VARIABLE` `scrollPrev`

- **Line:** 80

---

### `VARIABLE` `scrollNext`

- **Line:** 84

---

### `VARIABLE` `handleKeyDown`

- **Line:** 88

---

### `VARIABLE` `CarouselContent`

- **Line:** 153

---

### `VARIABLE` `CarouselItem`

- **Line:** 175

---

### `VARIABLE` `CarouselPrevious`

- **Line:** 197

---

### `VARIABLE` `CarouselNext`

- **Line:** 226

---


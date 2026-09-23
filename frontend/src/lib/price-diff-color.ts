/**
 * Płynna skala kolorów dla procentowej różnicy ceny oferty względem mediany
 * (np. dzielnicy): silna zieleń dla ofert wyraźnie tańszych, przez żółty i
 * pomarańczowy, aż po czerwień dla ofert wyraźnie droższych. Kolor zmienia
 * się stopniowo z każdym punktem procentowym (interpolacja liniowa odcienia
 * HSL między punktami kontrolnymi), a nie skokowo między progami.
 */

interface ColorStop {
  /** Różnica procentowa (offer vs mediana). */
  pct: number;
  /** Odcień HSL (0-360). */
  hue: number;
}

// -30% -> mocna zieleń, -15% -> żółty, 0% -> żółto-pomarańczowy,
// +15% -> pomarańczowy, +30% -> czerwony. Poza tym zakresem kolor jest
// "przypięty" do skrajnej zieleni/czerwieni.
const STOPS: ColorStop[] = [
  { pct: -30, hue: 142 },
  { pct: -15, hue: 48 },
  { pct: 0, hue: 36 },
  { pct: 15, hue: 25 },
  { pct: 30, hue: 0 },
];

function hueForPercent(percent: number): number {
  if (percent <= STOPS[0].pct) return STOPS[0].hue;
  if (percent >= STOPS[STOPS.length - 1].pct) return STOPS[STOPS.length - 1].hue;

  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (percent >= a.pct && percent <= b.pct) {
      const t = (percent - a.pct) / (b.pct - a.pct);
      return a.hue + (b.hue - a.hue) * t;
    }
  }
  return STOPS[STOPS.length - 1].hue;
}

export interface PriceDiffColor {
  /** Kolor tekstu/akcentu (nasycony). */
  text: string;
  /** Delikatny kolor tła (pastelowy odcień tego samego hue). */
  background: string;
}

export function getPriceDiffColor(percent: number | null | undefined): PriceDiffColor {
  const hue = hueForPercent(percent ?? 0);
  return {
    text: `hsl(${hue}, 72%, 32%)`,
    background: `hsl(${hue}, 85%, 94%)`,
  };
}

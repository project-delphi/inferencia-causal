# Inferencia causal clásica y bayesiana

Versión interactiva en [Quarto](https://quarto.org) / reveal.js de la presentación
**«Inferencia causal clásica y bayesiana: identificación, estimación e incertidumbre»**
de **Jhonier Rangel y Ravi Kalia, PhD** (14 de noviembre de 2026).

**Presentación en vivo:** https://project-delphi.github.io/inferencia-causal/
**English edition:** [`index.en.qmd`](index.en.qmd) → https://project-delphi.github.io/inferencia-causal/index.en.html

## Qué incluye

- Todo el contenido de las 46 diapositivas originales (PDF en [`original/`](original/)).
- **Simulaciones en vivo** con Observable JS: paradoja de Simpson, sesgo de selección,
  d-separación, laboratorio de estimadores (regresión / IPW / AIPW y doble robustez),
  RDD y ancho de banda, valor E, cobertura de intervalos de confianza y decisión bayesiana.
- **Escenas 3D con three.js**: red causal de portada, cirugía del grafo `do(T)` con
  caminos de puerta trasera, superficie del puntaje de propensión con pesos IPW y
  posterior conjugada normal en 3D.
- **Código en R y Python** (dagitty, DoWhy, MatchIt, DoubleML, grf, did, fixest,
  rdrobust, EValue, sensemakr, brms, PyMC, bartCause, CausalImpact).
- [`code/inferencia_causal.R`](code/inferencia_causal.R): script en R base, ejecutable,
  con MCO/FWL, g-computación, IPW, AIPW, emparejamiento, g-computación bayesiana y
  bootstrap bayesiano sobre datos simulados. Es una reimplementación nueva, no el
  archivo `inferencia_causal.R` original mencionado en el PDF.

## Uso local

```bash
quarto preview          # o: quarto render  → _site/index.html
Rscript code/inferencia_causal.R
```

Atajos: <kbd>→</kbd> avanzar, <kbd>F</kbd> pantalla completa, <kbd>M</kbd> menú,
<kbd>S</kbd> notas del orador. Las escenas 3D se rotan arrastrando con el ratón.

Cada `push` a `main` vuelve a publicar el sitio con GitHub Actions.

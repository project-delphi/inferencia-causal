# Classical and Bayesian Causal Inference · Inferencia causal clásica y bayesiana

Interactive slide decks on causal inference, built with [Quarto](https://quarto.org) and reveal.js. They include live
simulations you can change, rotatable 3D scenes, and code in R and Python. Everything runs in the browser, with no
installation needed.

By **Jhonier Rangel and Ravi Kalia, PhD** · first presented on 14 November 2026.

| Edition | Written for | Open the deck | Source |
|:--|:--|:--|:--|
| **English** | Advanced undergraduates who are new to causal inference | [project-delphi.github.io/inferencia-causal/index.en.html](https://project-delphi.github.io/inferencia-causal/index.en.html) | [`index.en.qmd`](index.en.qmd) |
| **Español** | Formal treatment (the original talk) | [project-delphi.github.io/inferencia-causal](https://project-delphi.github.io/inferencia-causal/) | [`index.qmd`](index.qmd) |

The English edition is **not a literal translation**. It is a teaching adaptation of the Spanish talk. It covers the same
material, but it builds intuition before formalism, follows one running example throughout, and adds worked examples,
quizzes, recap slides, and speaker notes. The Spanish edition stays a faithful, formal version of the original slides
(PDF in [`original/`](original/)).

[English](#english) · [Español](#español)

---

## English

### The question

> Patients who got the treatment did better. Did the treatment *cause* that, or were those patients different to begin with?

Every method in the deck answers that question. Each one is one stage of the same pipeline:

**Question → Estimand → Identification → Estimation → Uncertainty**

| Section | What you learn |
|:--|:--|
| 1. Foundations | Seeing vs. doing, Pearl's ladder of causation, and Simpson's paradox on real data |
| 2. Potential outcomes | Causal effects as comparisons of two worlds, ATE/ATT/CATE, selection bias, why randomization works, ignorability and positivity |
| 3. Causal graphs | DAGs and structural models, `do(·)` as graph surgery, chains/forks/colliders, d-separation, the backdoor and frontdoor criteria |
| 4. Classical estimation | Regression and g-computation, propensity scores, IPW, matching, doubly robust AIPW, double/debiased ML, confidence intervals |
| 5. When confounders are unobserved | Difference-in-differences, instrumental variables, regression discontinuity, synthetic control, sensitivity analysis (E-values) |
| 6. Bayesian causal inference | Missing potential outcomes as unknowns, Bayesian g-computation, priors, BART, diagnostics, decisions from the posterior |
| 7. Synthesis | Classical vs. Bayesian, identification vs. estimation, a reusable workflow, common mistakes, where to go next |

**Prerequisites:** probability and conditional expectation, linear and logistic regression, confidence intervals, Bayes' rule.
No prior causal inference is assumed. Slides marked **Going deeper · optional** can be skipped on a first pass.

### The running example: kidney stones

The deck follows one dataset from start to finish: 700 kidney-stone patients treated with open surgery (A) or a keyhole
procedure (B) ([Charig et al., 1986](https://doi.org/10.1136/bmj.292.6524.879)). Overall, B looks better (83% vs. 78% success).
Yet A is better for small stones *and* for large stones, because doctors gave A to the harder cases. The deck resolves the
paradox several ways, and every method agrees:

| Method | Effect of A vs. B |
|:--|:--|
| Naive comparison | −4.6 percentage points (B looks better) |
| Standardization by stone size | **+5.4 pp**, 95% CI [−1.2, +11.9] |
| Inverse probability weighting | **+5.4 pp** (identical) |
| Bayesian standardization | **+5.1 pp**, 95% credible interval [−1.4, +11.8], P(A better \| data) = 0.94 |

Reproduce every number with [`code/kidney_stones.R`](code/kidney_stones.R) (base R, about 70 lines).

### Interactive pieces

- **Live simulations** (Observable JS): Simpson's paradox, selection bias, collider bias (Berkson's paradox),
  d-separation, propensity-score overlap and exploding weights, an estimator lab (regression vs. IPW vs. AIPW, where you
  can break a model and watch double robustness), confidence-interval coverage, difference-in-differences with violated
  parallel trends, regression-discontinuity bandwidth, E-values, Bayesian kidney stones with a skeptical prior, and
  prior × likelihood → decision.
- **3D scenes** (three.js; drag to rotate): `do(T)` graph surgery with backdoor paths, the propensity surface and its IPW
  weights, and a conjugate normal posterior.
- **Quizzes** ("check your understanding"): which assumption fails, whether to adjust for a variable, which design fits a scenario.
- **Code** in R and Python: dagitty, DoWhy, MatchIt, marginaleffects, DoubleML, grf, did, fixest, rdrobust, EValue,
  sensemakr, brms, PyMC, bartCause, CausalImpact. These are snippets to read and adapt. You don't need any of these
  packages to view the deck.
- **Speaker notes** on every slide (press <kbd>S</kbd>).

Keys: <kbd>→</kbd>/<kbd>Space</kbd> next · <kbd>F</kbd> fullscreen · <kbd>M</kbd> menu (jump to any slide) ·
<kbd>S</kbd> speaker view · <kbd>Esc</kbd> overview.

### Run it locally

You need [Quarto](https://quarto.org/docs/get-started/) (tested with 1.10). Rendering needs neither R nor Python: the
simulations run in the browser.

```bash
quarto preview index.en.qmd     # live-reloading English deck
quarto preview index.qmd        # Spanish deck
quarto render                   # both decks → _site/
```

Optional companion scripts (base R only):

```bash
Rscript code/kidney_stones.R      # the running example (English comments)
Rscript code/inferencia_causal.R  # OLS/FWL, g-computation, IPW, AIPW, matching, Bayesian g-computation,
                                  # Bayesian bootstrap on simulated data (Spanish comments)
```

`code/inferencia_causal.R` is a new implementation. It is not the original `inferencia_causal.R` mentioned in the PDF.

Every push to `main` re-publishes the site to GitHub Pages ([`.github/workflows/publish.yml`](.github/workflows/publish.yml)).

### Repository layout

```
index.en.qmd             English edition (teaching adaptation)
index.qmd                Spanish edition (formal, follows the original PDF)
assets/theme.scss        theme, including the teaching components (blocks, badges, pipeline, quizzes)
assets/three-scenes.js   3D scenes; the UI language follows each deck's lang attribute
assets/three-*.html      import map for three.js and the scene loader
code/                    runnable R scripts
original/                the original PDF of the talk
_quarto.yml              project config (renders both decks to _site/)
```

### Notes for editors

- **Observable JS cells share one namespace per deck.** Two cells defining the same name will break the page. New
  variables in the English deck use a per-section prefix (`fd`, `po`, `gr`, `es`, `dz`, `by`, `sy`). Shared helpers
  (`mulberry32`, `randn`, `pnorm`, `olsFit`, `logitFit`, `debounce`, `quiz`, …) live in the last cell of each deck.
- **3D scenes** are placed with `::: {.three-stage data-three="dag|propensity|bayes"}` (or `.three-bg data-three="hero"`).
  They start only when their slide is visible.
- **Teaching components** for slides: `.block` (definition), `.block .theorem`, `.block .alert` (pitfall),
  `.block .intuition` (plain-language gloss), `.block .example` (running example), `{.deeper}` on a slide title
  (adds the "Going deeper · optional" badge), `{.recap}` (check-mark list), and the `.pipeline` HTML strip.

---

## Español

Presentación interactiva en [Quarto](https://quarto.org) / reveal.js de la charla
**«Inferencia causal clásica y bayesiana: identificación, estimación e incertidumbre»**
de **Jhonier Rangel y Ravi Kalia, PhD** (14 de noviembre de 2026).

**Presentación en vivo:** https://project-delphi.github.io/inferencia-causal/

### Qué incluye

- Todo el contenido de las diapositivas originales (PDF en [`original/`](original/)).
- **Simulaciones en vivo** con Observable JS: paradoja de Simpson, sesgo de selección, d-separación, laboratorio de
  estimadores (regresión / IPW / AIPW y doble robustez), RDD y ancho de banda, valor E, cobertura de intervalos de
  confianza y decisión bayesiana.
- **Escenas 3D con three.js**: red causal de portada, cirugía del grafo `do(T)` con caminos de puerta trasera, superficie
  del puntaje de propensión con pesos IPW y posterior conjugada normal en 3D.
- **Código en R y Python** (dagitty, DoWhy, MatchIt, DoubleML, grf, did, fixest, rdrobust, EValue, sensemakr, brms, PyMC,
  bartCause, CausalImpact).
- [`code/inferencia_causal.R`](code/inferencia_causal.R): script en R base, ejecutable, con MCO/FWL, g-computación, IPW,
  AIPW, emparejamiento, g-computación bayesiana y bootstrap bayesiano sobre datos simulados. Es una reimplementación
  nueva, no el archivo `inferencia_causal.R` original mencionado en el PDF.

La [edición en inglés](https://project-delphi.github.io/inferencia-causal/index.en.html) es una adaptación didáctica, no una
traducción literal. Está pensada para estudiantes avanzados de grado que se inician en la inferencia causal y sigue un
ejemplo de principio a fin (cálculos renales).

### Uso local

```bash
quarto preview index.qmd   # o: quarto render  → _site/index.html
Rscript code/inferencia_causal.R
```

Atajos: <kbd>→</kbd> avanzar, <kbd>F</kbd> pantalla completa, <kbd>M</kbd> menú, <kbd>S</kbd> vista del presentador,
<kbd>Esc</kbd> vista general. Las escenas 3D se rotan arrastrando con el ratón.

Cada `push` a `main` vuelve a publicar el sitio con GitHub Actions.

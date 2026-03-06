# Interactive Factorial ANOVA Teaching Demo (WebR + RevealJS)

## Goal

Build a fast, interactive way to teach factorial ANOVA interactions
using **live sliders** instead of pre‑built datasets.

Students instantly see how changing cell means creates interactions.

------------------------------------------------------------------------

## Conceptual Shift

Old workflow: simulate data → run ANOVA → plot → explain

New workflow: set cell means → auto simulate → ANOVA updates instantly →
students SEE interaction

No datasets required.

------------------------------------------------------------------------

## Minimal Architecture

Quarto RevealJS slide\
→ WebR runtime\
→ R function generates data\
→ ANOVA runs automatically\
→ Interaction plot updates live

------------------------------------------------------------------------

## Required Tools

-   Quarto
-   RevealJS slides
-   WebR enabled
-   One HTML slide
-   Four sliders

------------------------------------------------------------------------

## Example: 2×2 Interaction Demo

### Factors

Training Type: - Cardio - Strength

Drink Type: - Energy - Hydration

### Sliders (Cell Means)

-   Cardio + Energy
-   Cardio + Hydration
-   Strength + Energy
-   Strength + Hydration

Instructor moves sliders → plot changes instantly.

------------------------------------------------------------------------

## R Logic Behind the Scene

``` r
generate_data <- function(m11,m12,m21,m22,n=30,sd=8){

  A <- rep(c("Cardio","Strength"),each=2*n)
  B <- rep(rep(c("Energy","Hydration"),each=n),2)

  means <- c(rep(m11,n),
             rep(m12,n),
             rep(m21,n),
             rep(m22,n))

  y <- rnorm(4*n,means,sd)

  data.frame(A,B,y)
}
```

------------------------------------------------------------------------

## ANOVA + Plot

``` r
d <- generate_data(m11,m12,m21,m22)

model <- aov(y ~ A*B, data=d)
summary(model)

interaction.plot(d$A,d$B,d$y)
```

------------------------------------------------------------------------

## Teaching Strategy

1.  Ask students to predict results.
2.  Move sliders live.
3.  Show crossover interaction appear.
4.  Emphasize:

> Interaction answers WHEN an effect happens.

------------------------------------------------------------------------

## Why This Works

Students struggle because interactions feel abstract.

Live manipulation gives:

-   instant feedback
-   visual intuition
-   causal understanding

------------------------------------------------------------------------

## Expansion Ideas

-   3×2 design with six sliders
-   2×2×2 design with toggle switches
-   Auto effect‑size display
-   Live F‑statistics
-   Residual visualization

------------------------------------------------------------------------

## Recommended Workflow

Start with ONE powerful slide. Do not build a full app initially.

If successful: expand into full teaching platform.

------------------------------------------------------------------------

## Outcome

You replace static datasets with a live experimental laboratory inside
your slides.

Students finally understand interactions.

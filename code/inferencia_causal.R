# Inferencia causal clásica y bayesiana: ejemplos en R base
# ------------------------------------------------------------
# Implementa sobre datos simulados con confusión conocida:
#   diferencia ingenua, MCO (FWL), IPW (Horvitz–Thompson y Hajek), AIPW,
#   emparejamiento por puntaje de propensión, g-computación bayesiana
#   conjugada y bootstrap bayesiano para IPW.
# Sólo usa R base (>= 4.0). Ejecutar con: Rscript code/inferencia_causal.R

set.seed(2026)

# 1. Datos simulados -------------------------------------------------------
# DAG: X1 -> T, X2 -> T, X1 -> Y, X2 -> Y, T -> Y.  ATE verdadero = 2.
n   <- 2000
X1  <- rnorm(n)
X2  <- rnorm(n)
e   <- plogis(0.8 * X1 + 1.0 * X2)          # puntaje de propensión real
T   <- rbinom(n, 1, e)
Y0  <- 1 + 1.0 * X1 + 1.5 * X2 + rnorm(n)
Y1  <- Y0 + 2
Y   <- T * Y1 + (1 - T) * Y0                 # consistencia
d   <- data.frame(Y, T, X1, X2)
ATE <- mean(Y1 - Y0)

# 2. Diferencia ingenua = ATT + sesgo de selección --------------------------
naive <- mean(Y[T == 1]) - mean(Y[T == 0])
sesgo <- mean(Y0[T == 1]) - mean(Y0[T == 0])

# 3. Regresión y Frisch–Waugh–Lovell ----------------------------------------
fit_ols <- lm(Y ~ T + X1 + X2, data = d)
ry <- resid(lm(Y ~ X1 + X2, data = d))
rt <- resid(lm(T ~ X1 + X2, data = d))
fwl <- coef(lm(ry ~ rt))[2]                  # coincide con coef(fit_ols)["T"]

# g-computación (imputación) con interacciones T x X
fit_int <- lm(Y ~ T * (X1 + X2), data = d)
gcomp <- mean(predict(fit_int, transform(d, T = 1)) -
              predict(fit_int, transform(d, T = 0)))

# 4. Puntaje de propensión, IPW y AIPW ------------------------------------
ps     <- fitted(glm(T ~ X1 + X2, family = binomial, data = d))
ipw_ht <- mean(T * Y / ps) - mean((1 - T) * Y / (1 - ps))
w1 <- T / ps; w0 <- (1 - T) / (1 - ps)
ipw_hajek <- sum(w1 * Y) / sum(w1) - sum(w0 * Y) / sum(w0)

mu1 <- predict(lm(Y ~ X1 + X2, data = d, subset = T == 1), d)
mu0 <- predict(lm(Y ~ X1 + X2, data = d, subset = T == 0), d)
psi  <- mu1 - mu0 + T * (Y - mu1) / ps - (1 - T) * (Y - mu0) / (1 - ps)
aipw <- mean(psi)
aipw_se <- sd(psi) / sqrt(n)                 # varianza de la función de influencia

# 5. Emparejamiento 1:1 por vecino más cercano en logit(e), con reemplazo (ATT)
lp <- qlogis(ps)
tr <- which(T == 1); co <- which(T == 0)
match_idx <- vapply(tr, function(i) co[which.min(abs(lp[co] - lp[i]))], integer(1))
att_match <- mean(Y[tr] - Y[match_idx])
smd <- function(x, a, b) (mean(x[a]) - mean(x[b])) / sqrt((var(x[a]) + var(x[b])) / 2)
balance <- rbind(
  antes   = c(X1 = smd(X1, tr, co),        X2 = smd(X2, tr, co)),
  despues = c(X1 = smd(X1, tr, match_idx), X2 = smd(X2, tr, match_idx))
)

# 6. G-computación bayesiana (modelo normal conjugado, sigma^2 estimada) ------
# Prior: beta ~ N(0, 5^2 I); sigma^2 ~ Inv-chi^2 aproximada por su estimación.
X  <- model.matrix(~ T * (X1 + X2), data = d)
S0 <- diag(25, ncol(X))
s2 <- summary(fit_int)$sigma^2
S  <- solve(crossprod(X) / s2 + solve(S0))
m  <- S %*% (crossprod(X, Y) / s2)           # mu0 = 0
L  <- chol(S)
B  <- 4000
draws <- matrix(rnorm(B * ncol(X)), B) %*% L + matrix(m, B, ncol(X), byrow = TRUE)
X1m <- model.matrix(~ T * (X1 + X2), data = transform(d, T = 1))
X0m <- model.matrix(~ T * (X1 + X2), data = transform(d, T = 0))
tau_post <- as.vector(draws %*% colMeans(X1m - X0m))   # ATE de muestra (media condicional)

# 7. Bootstrap bayesiano (pesos Dirichlet) para IPW de Hajek ------------------
bb <- replicate(2000, {
  g  <- rexp(n)                               # Dirichlet(1, ..., 1) normalizado
  a1 <- g * w1; a0 <- g * w0
  sum(a1 * Y) / sum(a1) - sum(a0 * Y) / sum(a0)
})

# 8. Resultados -------------------------------------------------------------
res <- data.frame(
  metodo = c("Verdad (ATE de muestra)", "Diferencia ingenua", "MCO",
             "FWL", "g-computación", "IPW (HT)", "IPW (Hajek)", "AIPW",
             "Emparejamiento (ATT)", "Bayes g-comp (media post.)",
             "Bootstrap bayesiano IPW"),
  estimacion = c(ATE, naive, coef(fit_ols)["T"], fwl, gcomp, ipw_ht,
                 ipw_hajek, aipw, att_match, mean(tau_post), mean(bb))
)
res$estimacion <- round(res$estimacion, 3)
print(res, row.names = FALSE)
cat(sprintf("\nSesgo de selección en la diferencia ingenua: %.3f\n", sesgo))
cat(sprintf("AIPW: IC 95%% = [%.3f, %.3f]\n", aipw - 1.96 * aipw_se, aipw + 1.96 * aipw_se))
cat(sprintf("Bayes: IC creíble 95%% = [%.3f, %.3f];  P(tau > 0 | D) = %.3f\n",
            quantile(tau_post, .025), quantile(tau_post, .975), mean(tau_post > 0)))
cat("\nBalance (diferencias estandarizadas de medias):\n")
print(round(balance, 3))

# Kidney stones: the running example of the English edition
# ------------------------------------------------------------------
# Charig et al. (1986, BMJ). Treatment A = open surgery (T = 1),
# treatment B = percutaneous nephrolithotomy (T = 0). Outcome: success.
# Doctors chose the treatment knowing the stone size, so stone size
# confounds the naive comparison. Base R only (>= 4.0):
#   Rscript code/kidney_stones.R

# 1. The data: successes / patients in each (treatment, stone size) cell ----
success  <- c(A_small = 81, A_large = 192, B_small = 234, B_large = 55)
patients <- c(A_small = 87, A_large = 263, B_small = 270, B_large = 80)
rate     <- success / patients
N        <- sum(patients)                                   # 700

# 2. Naive comparison: B looks better ---------------------------------------
naive_A <- (81 + 192) / 350                                 # 78.0 %
naive_B <- (234 + 55) / 350                                 # 82.6 %

# 3. Standardization (backdoor adjustment for stone size) -------------------
p_small <- (87 + 270) / N                                   # P(small) = 0.51
p_large <- 1 - p_small
std_A <- p_small * rate[["A_small"]] + p_large * rate[["A_large"]]
std_B <- p_small * rate[["B_small"]] + p_large * rate[["B_large"]]
ate   <- std_A - std_B                                      # +5.4 pp for A

# Classical 95% CI (delta method, P(size) treated as fixed)
var_cell <- rate * (1 - rate) / patients
se <- sqrt(p_small^2 * (var_cell[["A_small"]] + var_cell[["B_small"]]) +
           p_large^2 * (var_cell[["A_large"]] + var_cell[["B_large"]]))
ci <- ate + c(-1, 1) * qnorm(0.975) * se

# 4. Inverse probability weighting gives the same answer ---------------------
e_small <- 87 / 357                                         # P(A | small) = 0.244
e_large <- 263 / 343                                        # P(A | large) = 0.767
w <- c(A_small = 1 / e_small, A_large = 1 / e_large,
       B_small = 1 / (1 - e_small), B_large = 1 / (1 - e_large))
pseudo <- patients * w                                      # 357 small, 343 large per arm
ipw_A <- sum(success[c("A_small", "A_large")] * w[c("A_small", "A_large")]) / N
ipw_B <- sum(success[c("B_small", "B_large")] * w[c("B_small", "B_large")]) / N

# 5. Bayesian standardization ----------------------------------------------
# Beta(1, 1) priors on the four success rates and on P(small);
# each posterior draw of the rates gives one draw of the ATE.
set.seed(1)
S     <- 1e5
draw  <- function(k) rbeta(S, 1 + success[[k]], 1 + patients[[k]] - success[[k]])
theta <- sapply(names(success), draw)
ps    <- rbeta(S, 1 + 357, 1 + 343)
tau   <- ps * (theta[, "A_small"] - theta[, "B_small"]) +
         (1 - ps) * (theta[, "A_large"] - theta[, "B_large"])

# 6. Results -----------------------------------------------------------------
pp <- function(x) sprintf("%+.1f pp", 100 * x)
cat("Naive difference (A - B):        ", pp(naive_A - naive_B), "\n")
cat("Stratum differences (A - B):      small", pp(rate[["A_small"]] - rate[["B_small"]]),
    "| large", pp(rate[["A_large"]] - rate[["B_large"]]), "\n")
cat("Standardized ATE:                ", pp(ate),
    sprintf("  95%% CI [%s, %s]", pp(ci[1]), pp(ci[2])), "\n")
cat("IPW pseudo-population per arm:    small", round(pseudo[["A_small"]]), "large", round(pseudo[["A_large"]]), "\n")
cat("IPW ATE:                         ", pp(ipw_A - ipw_B), "\n")
cat("Bayesian ATE (posterior mean):   ", pp(mean(tau)),
    sprintf("  95%% CrI [%s, %s]", pp(quantile(tau, 0.025)), pp(quantile(tau, 0.975))), "\n")
cat("P(ATE > 0 | data):               ", sprintf("%.2f", mean(tau > 0)), "\n")

import pandas as pd
import re
from collections import Counter

DATASET_PATH = "dataset/sif_sanket_synthetic_safety_reports_v4.csv"

print("\n==========================================")
print("       SIF-SANKET V4 DATASET AUDIT")
print("==========================================")

df = pd.read_csv(DATASET_PATH)

text = df["report_text"].astype(str)

# ============================================================
# 1. BASIC CHECK
# ============================================================

print("\n[1] BASIC DATASET CHECK")

print("Total rows:", len(df))
print("Columns:", list(df.columns))

print("\nLabel distribution:")
print(df["sif_potential"].value_counts())

print("\nLSR distribution:")
print(df["life_saving_rule"].value_counts())

# ============================================================
# 2. EXACT DUPLICATES
# ============================================================

print("\n[2] EXACT DUPLICATES")

exact_duplicates = text.duplicated().sum()

print("Exact duplicate rows:", exact_duplicates)
print("Unique texts:", text.nunique())

# ============================================================
# 3. NORMALIZED DUPLICATES
# ============================================================

print("\n[3] NORMALIZED DUPLICATES")


def normalize_text(x):
    x = x.lower()
    x = re.sub(r"\d+", "NUM", x)
    x = re.sub(r"[^a-z0-9\s]", " ", x)
    x = re.sub(r"\s+", " ", x)
    return x.strip()


normalized = text.apply(normalize_text)

normalized_duplicates = normalized.duplicated().sum()

print("Normalized duplicate rows:", normalized_duplicates)
print("Unique normalized texts:", normalized.nunique())

# ============================================================
# 4. CROSS-LABEL DUPLICATES
# ============================================================

print("\n[4] CROSS-LABEL DUPLICATES")

temp = pd.DataFrame({
    "text": normalized,
    "label": df["sif_potential"]
})

cross_label = (
    temp.groupby("text")["label"]
    .nunique()
)

cross_label_count = (cross_label > 1).sum()

print(
    "Texts appearing with both YES and NO:",
    cross_label_count
)

# ============================================================
# 5. LABEL / KEYWORD BIAS
# ============================================================

print("\n[5] LABEL-KEYWORD BIAS")

yes_text = " ".join(
    df[df["sif_potential"] == "YES"]["report_text"]
    .astype(str)
)

no_text = " ".join(
    df[df["sif_potential"] == "NO"]["report_text"]
    .astype(str)
)

yes_words = Counter(
    re.findall(r"\b[a-zA-Z]+\b", yes_text.lower())
)

no_words = Counter(
    re.findall(r"\b[a-zA-Z]+\b", no_text.lower())
)

all_words = set(yes_words) | set(no_words)

word_bias = []

for word in all_words:

    yes_count = yes_words[word]
    no_count = no_words[word]

    total = yes_count + no_count

    if total < 10:
        continue

    yes_ratio = yes_count / total

    if yes_ratio >= 0.90 or yes_ratio <= 0.10:

        word_bias.append(
            (
                word,
                yes_count,
                no_count,
                round(yes_ratio, 3)
            )
        )

word_bias.sort(
    key=lambda x: abs(x[3] - 0.5),
    reverse=True
)

print(
    "Strongly label-associated words:",
    len(word_bias)
)

print("\nTop label-associated words:")

for item in word_bias[:30]:
    print(item)

# ============================================================
# 6. TEMPLATE / PREFIX ANALYSIS
# ============================================================

print("\n[6] TEMPLATE PATTERN ANALYSIS")


def first_words(x, n=6):
    words = normalize_text(x).split()
    return " ".join(words[:n])


prefixes = text.apply(first_words)

prefix_counts = prefixes.value_counts()

print(
    "Unique first-6-word patterns:",
    len(prefix_counts)
)

print("\nMost common first-6-word patterns:")

for pattern, count in prefix_counts.head(20).items():
    print(f"{count:4d} | {pattern}")

# ============================================================
# 7. PREFIX LABEL BIAS
# ============================================================

print("\n[7] PREFIX LABEL BIAS")

prefix_df = pd.DataFrame({
    "prefix": prefixes,
    "label": df["sif_potential"]
})

prefix_stats = (
    prefix_df
    .groupby("prefix")["label"]
    .agg(["count", "nunique"])
)

biased_prefixes = prefix_stats[
    (prefix_stats["count"] >= 5) &
    (prefix_stats["nunique"] == 1)
]

print(
    "Repeated prefixes associated with only one label:",
    len(biased_prefixes)
)

print("\nExamples:")

for prefix, row in biased_prefixes.head(20).iterrows():
    print(
        f"{row['count']:4.0f} | {prefix}"
    )

# ============================================================
# 8. REPORT LENGTH ANALYSIS
# ============================================================

print("\n[8] REPORT LENGTH ANALYSIS")

df["word_count"] = text.apply(
    lambda x: len(x.split())
)

print(
    df.groupby("sif_potential")["word_count"]
    .agg(["min", "max", "mean", "median"])
)

# ============================================================
# 9. ACTIVITY / LABEL DISTRIBUTION
# ============================================================

print("\n[9] ACTIVITY × LABEL DISTRIBUTION")

activity_label = pd.crosstab(
    df["activity"],
    df["sif_potential"]
)

print(activity_label)

# ============================================================
# 10. LSR × LABEL DISTRIBUTION
# ============================================================

print("\n[10] LSR × LABEL DISTRIBUTION")

lsr_label = pd.crosstab(
    df["life_saving_rule"],
    df["sif_potential"]
)

print(lsr_label)

# ============================================================
# 11. FINAL VERDICT
# ============================================================

print("\n==========================================")
print("             AUDIT SUMMARY")
print("==========================================")

issues = 0

if exact_duplicates > 0:
    print("⚠ Exact duplicates found:", exact_duplicates)
    issues += 1
else:
    print("✓ No exact duplicates")

if normalized_duplicates > 0:
    print("⚠ Normalized duplicates found:", normalized_duplicates)
    issues += 1
else:
    print("✓ No normalized duplicates")

if cross_label_count > 0:
    print("⚠ Cross-label duplicate texts:", cross_label_count)
    issues += 1
else:
    print("✓ No cross-label duplicates")

if len(word_bias) > 20:
    print(
        "⚠ Strong lexical label bias detected:",
        len(word_bias),
        "words"
    )
    issues += 1
else:
    print("✓ No major lexical label bias detected")

if len(biased_prefixes) > 20:
    print(
        "⚠ Strong template/prefix bias detected:",
        len(biased_prefixes)
    )
    issues += 1
else:
    print("✓ No major prefix bias detected")

print("\nTotal potential issues:", issues)

if issues == 0:
    print("\nFINAL VERDICT: DATASET LOOKS READY FOR TRAINING")
else:
    print("\nFINAL VERDICT: DATASET NEEDS CLEANING BEFORE TRAINING")

print("\n==========================================")

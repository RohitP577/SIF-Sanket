import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split


DATASET_PATH = "dataset/sif_sanket_synthetic_safety_reports_v4.csv"

SEED = 42


# ============================================================
# LOAD DATA
# ============================================================

df = pd.read_csv(DATASET_PATH)

print("\n==========================================")
print("DATASET")
print("==========================================")

print("Total rows:", len(df))
print("Columns:", list(df.columns))

print("\nOriginal labels:")
print(df["sif_potential"].value_counts())


# ============================================================
# CHECK DUPLICATES
# ============================================================

print("\n==========================================")
print("DUPLICATE CHECK")
print("==========================================")

print(
    "Duplicate report_text:",
    df["report_text"].duplicated().sum()
)

print(
    "Unique report_text:",
    df["report_text"].nunique()
)


# ============================================================
# LABEL MAPPING
# ============================================================

label_map = {
    "NO": 0,
    "YES": 1
}

y = df["sif_potential"].astype(str).map(label_map).values
X = df["report_text"].astype(str)


# ============================================================
# SAME SPLIT AS TRAINING SCRIPT
# ============================================================

X_temp, X_test, y_temp, y_test = train_test_split(
    X,
    y,
    test_size=0.15,
    random_state=SEED,
    stratify=y
)

X_train, X_val, y_train, y_val = train_test_split(
    X_temp,
    y_temp,
    test_size=(15 / 85),
    random_state=SEED,
    stratify=y_temp
)


# ============================================================
# SPLIT DISTRIBUTION
# ============================================================

def show_distribution(name, labels):

    unique, counts = np.unique(
        labels,
        return_counts=True
    )

    print(f"\n{name}")
    print("-" * 40)

    for label, count in zip(unique, counts):

        text = "YES" if label == 1 else "NO"

        print(
            f"{text}: {count} ({count / len(labels) * 100:.2f}%)"
        )

    print("Total:", len(labels))


show_distribution("TRAIN", y_train)
show_distribution("VALIDATION", y_val)
show_distribution("TEST", y_test)


# ============================================================
# TEXT LENGTH
# ============================================================

print("\n==========================================")
print("TEXT LENGTH")
print("==========================================")

train_lengths = X_train.str.len()
val_lengths = X_val.str.len()
test_lengths = X_test.str.len()

print(
    "TRAIN:",
    "min =", train_lengths.min(),
    "max =", train_lengths.max(),
    "mean =", round(train_lengths.mean(), 2)
)

print(
    "VAL:",
    "min =", val_lengths.min(),
    "max =", val_lengths.max(),
    "mean =", round(val_lengths.mean(), 2)
)

print(
    "TEST:",
    "min =", test_lengths.min(),
    "max =", test_lengths.max(),
    "mean =", round(test_lengths.mean(), 2)
)


# ============================================================
# SAMPLE REPORTS
# ============================================================

print("\n==========================================")
print("TRAIN SAMPLES")
print("==========================================")

for i in range(5):

    print("\n--- TRAIN", i + 1, "---")
    print("LABEL:", "YES" if y_train[i] == 1 else "NO")
    print(X_train.iloc[i])


print("\n==========================================")
print("VALIDATION SAMPLES")
print("==========================================")

for i in range(5):

    print("\n--- VALIDATION", i + 1, "---")
    print("LABEL:", "YES" if y_val[i] == 1 else "NO")
    print(X_val.iloc[i])


print("\n==========================================")
print("TEST SAMPLES")
print("==========================================")

for i in range(5):

    print("\n--- TEST", i + 1, "---")
    print("LABEL:", "YES" if y_test[i] == 1 else "NO")
    print(X_test.iloc[i])


print("\n==========================================")
print("INSPECTION COMPLETE")
print("==========================================")
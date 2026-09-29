import pandas as pd
import numpy as np

from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer
)

from sklearn.model_selection import train_test_split

from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report
)


print("==========================================")
print("     SIF-GUARD MODEL EVALUATION")
print("==========================================")


# ==========================================
# 1. LOAD DATASET
# ==========================================

DATA_PATH = "dataset/sif_sanket_synthetic_safety_reports_v3.csv"

# Correct saved v3 model
MODEL_PATH = "./models/xlm_roberta_sif_v3"

df = pd.read_csv(DATA_PATH)

print("\n========== DATASET ==========")
print("Rows:", len(df))
print("Columns:", len(df.columns))


# ==========================================
# 2. LABEL MAPPING
# ==========================================

label_map = {
    "NO": 0,
    "YES": 1
}

df["label"] = df["sif_potential"].map(label_map)

# Safety check
if df["label"].isnull().any():
    raise ValueError("Some labels could not be mapped to 0/1.")

print("\n========== LABEL DISTRIBUTION ==========")
print(df["sif_potential"].value_counts())


# ==========================================
# 3. EXACT SAME TRAIN / VALIDATION / TEST
#    SPLIT USED DURING TRAINING
# ==========================================

X = df["report_text"].values
y = df["label"].values


# First split:
# 85% temporary data
# 15% final test data

X_temp, X_test, y_temp, y_test = train_test_split(
    X,
    y,
    test_size=0.15,
    random_state=42,
    stratify=y
)


# Second split:
# From the remaining 85%:
# 15% of total becomes validation
# Therefore test_size = 15/85

X_train, X_val, y_train, y_val = train_test_split(
    X_temp,
    y_temp,
    test_size=(15 / 85),
    random_state=42,
    stratify=y_temp
)


print("\n========== DATASET SPLIT ==========")
print("Training   :", len(X_train))
print("Validation :", len(X_val))
print("Test       :", len(X_test))


# ==========================================
# 4. BUILD TEST DATAFRAME
# ==========================================

test_df = pd.DataFrame({
    "report_text": X_test,
    "label": y_test
})


print("\n========== TEST DATA ==========")
print("Test samples:", len(test_df))


# ==========================================
# 5. LOAD TOKENIZER
# ==========================================

print("\n========== TOKENIZER ==========")

tokenizer = AutoTokenizer.from_pretrained(
    "xlm-roberta-base"
)


# ==========================================
# 6. TEXT COLUMN
# ==========================================

TEXT_COLUMN = "report_text"

if TEXT_COLUMN not in test_df.columns:
    raise ValueError(
        f"Column '{TEXT_COLUMN}' not found."
    )


# ==========================================
# 7. TOKENIZE TEST DATA
# ==========================================

def tokenize_function(examples):

    return tokenizer(
        examples[TEXT_COLUMN],
        truncation=True,
        padding="max_length",
        max_length=128
    )


test_dataset = Dataset.from_pandas(
    test_df[[TEXT_COLUMN, "label"]],
    preserve_index=False
)


test_dataset = test_dataset.map(
    tokenize_function,
    batched=True
)


test_dataset = test_dataset.remove_columns(
    [TEXT_COLUMN]
)


test_dataset.set_format("torch")


# ==========================================
# 8. LOAD TRAINED MODEL
# ==========================================

print("\n========== LOADING TRAINED MODEL ==========")

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_PATH,
    num_labels=2
)

print("Model loaded successfully.")


# ==========================================
# 9. TRAINER
# ==========================================

trainer = Trainer(
    model=model
)


# ==========================================
# 10. GENERATE PREDICTIONS
# ==========================================

print("\n========== GENERATING PREDICTIONS ==========")

predictions = trainer.predict(
    test_dataset
)

logits = predictions.predictions

y_true = np.array(test_df["label"])

y_pred = np.argmax(
    logits,
    axis=1
)


# ==========================================
# 11. FINAL METRICS
# ==========================================

accuracy = accuracy_score(
    y_true,
    y_pred
)


precision, recall, f1, _ = precision_recall_fscore_support(
    y_true,
    y_pred,
    average="binary",
    zero_division=0
)


print("\n========== FINAL METRICS ==========")

print(f"Accuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1 Score : {f1:.4f}")


# ==========================================
# 12. CONFUSION MATRIX
# ==========================================

print("\n========== CONFUSION MATRIX ==========")

cm = confusion_matrix(
    y_true,
    y_pred
)

print(cm)


# ==========================================
# 13. CLASSIFICATION REPORT
# ==========================================

print("\n========== CLASSIFICATION REPORT ==========")

print(
    classification_report(
        y_true,
        y_pred,
        target_names=["NO", "YES"],
        zero_division=0
    )
)


# ==========================================
# 14. FINAL SUMMARY
# ==========================================

print("\n========== EVALUATION SUMMARY ==========")

print(f"Dataset size : {len(df)}")
print(f"Train size   : {len(X_train)}")
print(f"Validation   : {len(X_val)}")
print(f"Test size    : {len(X_test)}")

print(f"\nAccuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1 Score : {f1:.4f}")

print("\n========== EVALUATION COMPLETE ==========")
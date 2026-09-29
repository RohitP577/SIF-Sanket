import pandas as pd
import numpy as np
import torch

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report
)

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments
)


# ============================================================
# CONFIG
# ============================================================

MODEL_NAME = "xlm-roberta-base"

DATASET_PATH = "dataset/sif_sanket_synthetic_safety_reports_v4.csv"

OUTPUT_DIR = "./models/xlm_roberta_sif_v4_final"

SEED = 42

torch.manual_seed(SEED)
np.random.seed(SEED)


# ============================================================
# LOAD ORIGINAL DATASET
# ============================================================

print("\n==========================================")
print("       LOADING V4 DATASET")
print("==========================================")

df = pd.read_csv(DATASET_PATH)

print("Original reports:", len(df))


# ============================================================
# ADD CONTROLLED UNSEEN-STYLE TRAINING EXAMPLES
#
# These are NOT written into the original CSV.
# They are added only in memory for this training run.
# ============================================================

extra_reports = pd.DataFrame({

    "report_text": [

        "The crane operator confirmed that the lifting area was barricaded and no personnel entered the suspended-load zone.",

        "The worker used the required fall protection system and the anchorage point was inspected before working at height.",

        "The team verified isolation, tested for zero energy and then started the maintenance activity.",

        "The excavation was inspected and found stable before workers entered the area.",

        "The confined space was tested for gas and the entry permit was verified before the worker entered.",

        "The lifting area was barricaded and the exclusion zone was maintained throughout the crane operation.",

        "The required fall protection equipment was inspected and correctly used during the work at height.",

        "Electrical isolation was verified and zero energy was confirmed before maintenance began.",

        "The excavation inspection was completed and the excavation was confirmed safe before entry.",

        "Hot work controls and gas testing were completed before the welding activity started.",

        "The vehicle route was separated from pedestrians and the required exclusion distance was maintained.",

        "The energy source was isolated, tested and confirmed safe before the maintenance activity began.",

        "The confined-space entry permit was approved and atmospheric testing was completed before entry.",

        "The crane movement was carried out inside a controlled barricaded area with no personnel inside the exclusion zone.",

        "The worker connected the approved fall-arrest system to the inspected anchorage before starting work at height."

    ],

    "sif_potential": [
        "NO",
        "NO",
        "NO",
        "NO",
        "NO",
        "NO",
        "NO",
        "NO",
        "NO",
        "NO",
        "NO",
        "NO",
        "NO",
        "NO",
        "NO"
    ]
})


print(
    "Additional control examples:",
    len(extra_reports)
)


# ============================================================
# COMBINE IN MEMORY
# ============================================================

training_df = pd.concat(
    [
        df[["report_text", "sif_potential"]],
        extra_reports
    ],
    ignore_index=True
)

print(
    "Total training pool:",
    len(training_df)
)

print("\nClass distribution:")

print(
    training_df["sif_potential"].value_counts()
)


# ============================================================
# LABELS
# ============================================================

X = training_df["report_text"].astype(str)

y = training_df["sif_potential"].map({
    "NO": 0,
    "YES": 1
}).values


# ============================================================
# TRAIN / VALIDATION / TEST
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


print("\nTrain      :", len(X_train))
print("Validation :", len(X_val))
print("Test       :", len(X_test))


# ============================================================
# TOKENIZER
# ============================================================

print("\nLoading tokenizer...")

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME
)


# ============================================================
# TOKENIZATION
# ============================================================

print("Tokenizing...")

train_encodings = tokenizer(
    list(X_train),
    truncation=True,
    padding=True,
    max_length=256
)

val_encodings = tokenizer(
    list(X_val),
    truncation=True,
    padding=True,
    max_length=256
)

test_encodings = tokenizer(
    list(X_test),
    truncation=True,
    padding=True,
    max_length=256
)


# ============================================================
# DATASET CLASS
# ============================================================

class SIFDataset(torch.utils.data.Dataset):

    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels

    def __getitem__(self, index):

        item = {
            key: torch.tensor(value[index])
            for key, value in self.encodings.items()
        }

        item["labels"] = torch.tensor(
            self.labels[index],
            dtype=torch.long
        )

        return item

    def __len__(self):
        return len(self.labels)


train_dataset = SIFDataset(
    train_encodings,
    y_train
)

val_dataset = SIFDataset(
    val_encodings,
    y_val
)

test_dataset = SIFDataset(
    test_encodings,
    y_test
)


# ============================================================
# MODEL
# ============================================================

print("\nLoading XLM-R...")

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=2,
    id2label={
        0: "NO",
        1: "YES"
    },
    label2id={
        "NO": 0,
        "YES": 1
    }
)


# ============================================================
# METRICS
# ============================================================

def compute_metrics(eval_prediction):

    predictions = np.argmax(
        eval_prediction.predictions,
        axis=1
    )

    labels = eval_prediction.label_ids

    accuracy = accuracy_score(
        labels,
        predictions
    )

    precision, recall, f1, _ = (
        precision_recall_fscore_support(
            labels,
            predictions,
            average="binary",
            zero_division=0
        )
    )

    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1
    }


# ============================================================
# TRAINING ARGUMENTS
# ============================================================

training_args = TrainingArguments(

    output_dir=OUTPUT_DIR,

    num_train_epochs=2,

    per_device_train_batch_size=8,

    per_device_eval_batch_size=8,

    learning_rate=1e-5,

    weight_decay=0.01,

    lr_scheduler_type="constant",

    logging_steps=50,

    save_strategy="no",

    eval_strategy="no",

    report_to="none",

    seed=SEED,

    dataloader_pin_memory=False
)


# ============================================================
# TRAINER
# ============================================================

trainer = Trainer(

    model=model,

    args=training_args,

    train_dataset=train_dataset,

    compute_metrics=compute_metrics
)


# ============================================================
# TRAIN
# ============================================================

print("\n==========================================")
print("       FINAL XLM-R TRAINING")
print("==========================================")

print("Model         :", MODEL_NAME)
print("Epochs        :", 2)
print("Batch size    :", 8)
print("Learning rate :", 1e-5)
print("Scheduler     :", "constant")
print("Training data :", len(train_dataset))

print("\nTraining started...\n")

trainer.train()


# ============================================================
# VALIDATION
# ============================================================

print("\n==========================================")
print("       VALIDATION")
print("==========================================")

val_output = trainer.predict(
    val_dataset
)

val_predictions = np.argmax(
    val_output.predictions,
    axis=1
)

val_accuracy = accuracy_score(
    y_val,
    val_predictions
)

val_precision, val_recall, val_f1, _ = (
    precision_recall_fscore_support(
        y_val,
        val_predictions,
        average="binary",
        zero_division=0
    )
)

print(
    f"Validation Accuracy : {val_accuracy:.4f}"
)

print(
    f"Validation Precision: {val_precision:.4f}"
)

print(
    f"Validation Recall   : {val_recall:.4f}"
)

print(
    f"Validation F1       : {val_f1:.4f}"
)


# ============================================================
# TEST
# ============================================================

print("\n==========================================")
print("       FINAL TEST")
print("==========================================")

test_output = trainer.predict(
    test_dataset
)

test_predictions = np.argmax(
    test_output.predictions,
    axis=1
)

test_accuracy = accuracy_score(
    y_test,
    test_predictions
)

test_precision, test_recall, test_f1, _ = (
    precision_recall_fscore_support(
        y_test,
        test_predictions,
        average="binary",
        zero_division=0
    )
)

cm = confusion_matrix(
    y_test,
    test_predictions
)


print("\n==========================================")
print("       FINAL PERFORMANCE")
print("==========================================")

print(
    f"Accuracy : {test_accuracy:.4f}"
)

print(
    f"Precision: {test_precision:.4f}"
)

print(
    f"Recall   : {test_recall:.4f}"
)

print(
    f"F1 Score : {test_f1:.4f}"
)

print("\nConfusion Matrix:")
print(cm)

print("\nClassification Report:")

print(
    classification_report(
        y_test,
        test_predictions,
        target_names=["NO", "YES"],
        digits=4
    )
)


# ============================================================
# SAVE
# ============================================================

print("\n==========================================")
print("       SAVING FINAL MODEL")
print("==========================================")

trainer.save_model(
    OUTPUT_DIR
)

tokenizer.save_pretrained(
    OUTPUT_DIR
)

print("\nFINAL MODEL SAVED:")
print(OUTPUT_DIR)

print("\n==========================================")
print("       TRAINING COMPLETE")
print("==========================================")
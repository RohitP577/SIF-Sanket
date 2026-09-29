import pandas as pd
import numpy as np
import torch

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

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

OUTPUT_DIR = "./models/full_train_test"

SEED = 42

torch.manual_seed(SEED)
np.random.seed(SEED)


# ============================================================
# LOAD DATA
# ============================================================

df = pd.read_csv(DATASET_PATH)

X = df["report_text"].astype(str)

label_map = {
    "NO": 0,
    "YES": 1
}

y = df["sif_potential"].astype(str).map(label_map).values


# ============================================================
# SPLIT
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.15,
    random_state=SEED,
    stratify=y
)

print("\n==========================================")
print("DATA")
print("==========================================")

print("Train:", len(X_train))
print("Test :", len(X_test))


# ============================================================
# TOKENIZER
# ============================================================

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME
)

train_encodings = tokenizer(
    list(X_train),
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
# DATASET
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

test_dataset = SIFDataset(
    test_encodings,
    y_test
)


# ============================================================
# MODEL
# ============================================================

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
# TRAINING
# ============================================================

training_args = TrainingArguments(

    output_dir=OUTPUT_DIR,

    num_train_epochs=1,

    per_device_train_batch_size=4,

    learning_rate=2e-5,

    weight_decay=0.01,

    logging_steps=100,

    save_strategy="no",

    eval_strategy="no",

    report_to="none",

    seed=SEED
)


trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset
)


# ============================================================
# TRAIN
# ============================================================

print("\n==========================================")
print("STARTING 1-EPOCH FULL TRAINING")
print("==========================================")

trainer.train()


# ============================================================
# TEST
# ============================================================

print("\n==========================================")
print("TESTING")
print("==========================================")

output = trainer.predict(test_dataset)

predictions = np.argmax(
    output.predictions,
    axis=1
)

accuracy = accuracy_score(
    y_test,
    predictions
)

precision, recall, f1, _ = precision_recall_fscore_support(
    y_test,
    predictions,
    average="binary",
    zero_division=0
)

print("\n==========================================")
print("RESULT")
print("==========================================")

print(f"Accuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1       : {f1:.4f}")


# ============================================================
# SAVE
# ============================================================

trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print("\nModel saved:")
print(OUTPUT_DIR)
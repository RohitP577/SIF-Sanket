import pandas as pd
import numpy as np
import torch

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments
)

from sklearn.metrics import accuracy_score


# ============================================================
# CONFIG
# ============================================================

MODEL_NAME = "xlm-roberta-base"
SEED = 42

torch.manual_seed(SEED)
np.random.seed(SEED)


# ============================================================
# LOAD ONLY 32 SAMPLES
# ============================================================

df = pd.read_csv(
    "dataset/sif_sanket_synthetic_safety_reports_v4.csv"
)

df = pd.concat([
    df[df["sif_potential"] == "YES"].head(16),
    df[df["sif_potential"] == "NO"].head(16)
])

df = df.sample(
    frac=1,
    random_state=SEED
).reset_index(drop=True)

texts = df["report_text"].astype(str).tolist()

labels = np.array([
    1 if x == "YES" else 0
    for x in df["sif_potential"]
])

print("Samples:", len(texts))
print("YES:", sum(labels == 1))
print("NO :", sum(labels == 0))


# ============================================================
# TOKENIZER
# ============================================================

print("\nLoading tokenizer...")

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME
)

encodings = tokenizer(
    texts,
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


dataset = SIFDataset(
    encodings,
    labels
)


# ============================================================
# MODEL
# ============================================================

print("\nLoading model...")

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

    accuracy = accuracy_score(
        eval_prediction.label_ids,
        predictions
    )

    return {
        "accuracy": accuracy
    }


# ============================================================
# TRAINER
# ============================================================

training_args = TrainingArguments(

    output_dir="./trainer_sanity_output",

    num_train_epochs=20,

    per_device_train_batch_size=8,

    learning_rate=2e-5,

    weight_decay=0.01,

    logging_steps=10,

    eval_strategy="no",

    save_strategy="no",

    report_to="none",

    seed=SEED
)


trainer = Trainer(

    model=model,

    args=training_args,

    train_dataset=dataset,

    compute_metrics=compute_metrics
)


# ============================================================
# TRAIN
# ============================================================

print("\n==========================================")
print("      TRAINER SANITY TEST")
print("==========================================")

trainer.train()


# ============================================================
# PREDICTION
# ============================================================

print("\n==========================================")
print("      FINAL PREDICTION")
print("==========================================")

output = trainer.predict(dataset)

predictions = np.argmax(
    output.predictions,
    axis=1
)

accuracy = accuracy_score(
    labels,
    predictions
)

print("Final Accuracy:", accuracy)

print("\nActual vs Predicted:")

for i in range(len(labels)):

    actual = "YES" if labels[i] == 1 else "NO"
    predicted = "YES" if predictions[i] == 1 else "NO"

    print(
        f"{i+1:02d}. Actual={actual:3s} | Predicted={predicted:3s}"
    )
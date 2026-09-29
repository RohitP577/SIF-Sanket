import torch
import pandas as pd

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification
)

MODEL_NAME = "xlm-roberta-base"

# --------------------------------------------------
# Load only 32 existing V4 reports
# --------------------------------------------------

df = pd.read_csv(
    "dataset/sif_sanket_synthetic_safety_reports_v4.csv"
)

df = pd.concat([
    df[df["sif_potential"] == "YES"].head(16),
    df[df["sif_potential"] == "NO"].head(16)
]).sample(frac=1, random_state=42).reset_index(drop=True)

texts = df["report_text"].astype(str).tolist()

labels = torch.tensor(
    [1 if x == "YES" else 0 for x in df["sif_potential"]],
    dtype=torch.long
)

print("Samples:", len(texts))
print("YES:", (labels == 1).sum().item())
print("NO :", (labels == 0).sum().item())

# --------------------------------------------------
# Tokenizer + model
# --------------------------------------------------

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=2,
    id2label={0: "NO", 1: "YES"},
    label2id={"NO": 0, "YES": 1}
)

model.train()

# --------------------------------------------------
# Tokenize
# --------------------------------------------------

inputs = tokenizer(
    texts,
    padding=True,
    truncation=True,
    max_length=256,
    return_tensors="pt"
)

# --------------------------------------------------
# Optimizer
# --------------------------------------------------

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=2e-5
)

# --------------------------------------------------
# Training
# --------------------------------------------------

print("\nStarting sanity training...\n")

for step in range(1, 101):

    optimizer.zero_grad()

    outputs = model(
        **inputs,
        labels=labels
    )

    loss = outputs.loss

    loss.backward()

    optimizer.step()

    if step == 1 or step % 10 == 0:

        with torch.no_grad():
            predictions = torch.argmax(
                outputs.logits,
                dim=1
            )

            accuracy = (
                predictions == labels
            ).float().mean().item()

        print(
            f"Step {step:3d} | "
            f"Loss: {loss.item():.4f} | "
            f"Accuracy: {accuracy:.4f}"
        )
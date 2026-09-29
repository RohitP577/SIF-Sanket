import pandas as pd
import numpy as np
import torch

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification
)


# ============================================================
# CONFIG
# ============================================================

MODEL_PATH = "./models/xlm_roberta_sif_v4"

DATASET_PATH = "dataset/sif_sanket_synthetic_safety_reports_v4.csv"


# ============================================================
# LOAD MODEL
# ============================================================

print("\n==========================================")
print("       LOADING TRAINED MODEL")
print("==========================================")

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_PATH
)

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_PATH
)

model.eval()


# ============================================================
# LOAD DATASET
# ============================================================

print("\n==========================================")
print("       ANALYZING DATASET")
print("==========================================")

df = pd.read_csv(DATASET_PATH)

print("Total reports:", len(df))

print("\nClass distribution:")

print(
    df["sif_potential"].value_counts()
)


# ============================================================
# SHOW EXAMPLES FROM EACH CLASS
# ============================================================

print("\n==========================================")
print("       YES EXAMPLES")
print("==========================================")

yes_examples = df[
    df["sif_potential"] == "YES"
]["report_text"].head(5)

for i, text in enumerate(yes_examples, 1):

    print(f"\nYES {i}:")
    print(text)


print("\n==========================================")
print("       NO EXAMPLES")
print("==========================================")

no_examples = df[
    df["sif_potential"] == "NO"
]["report_text"].head(5)

for i, text in enumerate(no_examples, 1):

    print(f"\nNO {i}:")
    print(text)


# ============================================================
# UNSEEN REPORTS
# ============================================================

unseen_reports = [

    (
        "A worker entered a confined space without completing gas testing "
        "and without a valid entry permit.",
        "YES"
    ),

    (
        "During maintenance, the equipment was properly isolated "
        "and the isolation was verified before work started.",
        "NO"
    ),

    (
        "A vehicle was operated near pedestrians without maintaining "
        "the required separation distance.",
        "YES"
    ),

    (
        "The crane operator confirmed that the lifting area was barricaded "
        "and no personnel entered the suspended-load zone.",
        "NO"
    ),

    (
        "Hot work started before the required gas test was completed "
        "and the area was declared safe.",
        "YES"
    ),

    (
        "The worker used the required fall protection system and the "
        "anchorage point was inspected before working at height.",
        "NO"
    ),

    (
        "A technician began maintenance on energized equipment before "
        "electrical isolation was confirmed.",
        "YES"
    ),

    (
        "The team verified isolation, tested for zero energy and then "
        "started the maintenance activity.",
        "NO"
    ),

    (
        "A worker entered an excavation where the required inspection "
        "had not been completed.",
        "YES"
    ),

    (
        "The excavation was inspected and found stable before workers "
        "entered the area.",
        "NO"
    )
]


# ============================================================
# PREDICTION
# ============================================================

print("\n==========================================")
print("       UNSEEN ERROR ANALYSIS")
print("==========================================")

correct = 0
incorrect = 0


for index, (text, expected) in enumerate(
    unseen_reports,
    start=1
):

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=256
    )

    with torch.no_grad():

        outputs = model(**inputs)

        probabilities = torch.softmax(
            outputs.logits,
            dim=1
        )[0]

    predicted_id = torch.argmax(
        probabilities
    ).item()

    prediction = model.config.id2label[
        predicted_id
    ]

    confidence = probabilities[
        predicted_id
    ].item() * 100

    if prediction == expected:

        status = "CORRECT"
        correct += 1

    else:

        status = "WRONG"
        incorrect += 1

    print("\n------------------------------------------")

    print(f"Report #{index}")

    print("Expected   :", expected)

    print("Predicted  :", prediction)

    print(
        "Confidence : {:.2f}%".format(
            confidence
        )
    )

    print("Status     :", status)

    print("Text       :", text)


# ============================================================
# SUMMARY
# ============================================================

total = len(unseen_reports)

accuracy = (
    correct / total
) * 100


print("\n==========================================")
print("       ERROR ANALYSIS SUMMARY")
print("==========================================")

print("Total unseen reports :", total)

print("Correct              :", correct)

print("Incorrect            :", incorrect)

print(
    "Unseen Accuracy      : {:.2f}%".format(
        accuracy
    )
)


# ============================================================
# DATASET LANGUAGE PATTERN ANALYSIS
# ============================================================

print("\n==========================================")
print("       DATASET PATTERN ANALYSIS")
print("==========================================")

for label in ["YES", "NO"]:

    subset = df[
        df["sif_potential"] == label
    ]

    text_lengths = (
        subset["report_text"]
        .astype(str)
        .str.len()
    )

    print(f"\n{label} reports:")

    print(
        "Average text length:",
        round(text_lengths.mean(), 2)
    )

    print(
        "Minimum text length:",
        text_lengths.min()
    )

    print(
        "Maximum text length:",
        text_lengths.max()
    )


# ============================================================
# COMPLETE
# ============================================================

print("\n==========================================")
print("       ANALYSIS COMPLETE")
print("==========================================")
import numpy as np
import torch

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification
)


# ==========================================
# CONFIG
# ==========================================

MODEL_PATH = "./models/xlm_roberta_sif_v4"
MODEL_NAME = "xlm-roberta-base"


# ==========================================
# UNSEEN SAFETY REPORTS
# These reports are NOT loaded from the
# training/test CSV.
# ==========================================

unseen_reports = [

    # ---------- EXPECTED YES ----------

    {
        "id": "UNSEEN-01",
        "expected": "YES",
        "text": (
            "During maintenance of a pressurized pipeline, "
            "the isolation point was not confirmed before work started. "
            "Workers were positioned close to the potential energy release path."
        )
    },

    {
        "id": "UNSEEN-02",
        "expected": "YES",
        "text": (
            "A technician entered a vessel to inspect internal equipment "
            "before atmospheric testing and entry authorization were completed."
        )
    },

    {
        "id": "UNSEEN-03",
        "expected": "YES",
        "text": (
            "While a crane was moving a suspended load, a worker entered "
            "the load travel area and remained underneath the moving equipment."
        )
    },

    {
        "id": "UNSEEN-04",
        "expected": "YES",
        "text": (
            "Welding activity was started near hydrocarbon equipment "
            "without completing the required gas testing and hot-work controls."
        )
    },

    {
        "id": "UNSEEN-05",
        "expected": "YES",
        "text": (
            "Electrical maintenance continued even though the energy source "
            "had not been positively isolated and verified before the task."
        )
    },

    {
        "id": "UNSEEN-06",
        "expected": "YES",
        "text": (
            "A reversing vehicle moved through a work area while a pedestrian "
            "was inside the vehicle movement path without effective separation."
        )
    },

    {
        "id": "UNSEEN-07",
        "expected": "YES",
        "text": (
            "Workers began opening a process line while residual pressure "
            "had not been confirmed as fully released."
        )
    },

    {
        "id": "UNSEEN-08",
        "expected": "YES",
        "text": (
            "The lifting crew proceeded with the operation after discovering "
            "that the exclusion zone around the suspended load was incomplete."
        )
    },

    {
        "id": "UNSEEN-09",
        "expected": "YES",
        "text": (
            "A confined-space entry continued after the communication system "
            "with the standby person became unavailable."
        )
    },

    {
        "id": "UNSEEN-10",
        "expected": "YES",
        "text": (
            "During grinding work, personnel were exposed to the work area "
            "without the required controls for the high-energy activity."
        )
    },


    # ---------- EXPECTED NO ----------

    {
        "id": "UNSEEN-11",
        "expected": "NO",
        "text": (
            "The maintenance team completed the pump inspection after verifying "
            "the isolation points and confirming that all required controls were effective."
        )
    },

    {
        "id": "UNSEEN-12",
        "expected": "NO",
        "text": (
            "The vessel inspection was completed according to the approved procedure. "
            "The required entry controls were verified before personnel approached the area."
        )
    },

    {
        "id": "UNSEEN-13",
        "expected": "NO",
        "text": (
            "The crane operation was completed with the exclusion zone established "
            "and all personnel kept outside the suspended-load area."
        )
    },

    {
        "id": "UNSEEN-14",
        "expected": "NO",
        "text": (
            "The welding task was performed after the permit, gas testing and "
            "required hot-work precautions had been verified."
        )
    },

    {
        "id": "UNSEEN-15",
        "expected": "NO",
        "text": (
            "Electrical maintenance was carried out after isolation was confirmed "
            "and the responsible supervisor verified the required controls."
        )
    },

    {
        "id": "UNSEEN-16",
        "expected": "NO",
        "text": (
            "The vehicle movement was completed using the designated route, "
            "with pedestrians separated from the operating area."
        )
    },

    {
        "id": "UNSEEN-17",
        "expected": "NO",
        "text": (
            "The pipeline inspection was completed normally with pressure "
            "conditions checked and the approved procedure followed."
        )
    },

    {
        "id": "UNSEEN-18",
        "expected": "NO",
        "text": (
            "The lifting activity was completed under supervision with the "
            "barricaded area maintained throughout the operation."
        )
    },

    {
        "id": "UNSEEN-19",
        "expected": "NO",
        "text": (
            "The confined-space preparation was completed after checking the "
            "required authorization, atmosphere and communication arrangements."
        )
    },

    {
        "id": "UNSEEN-20",
        "expected": "NO",
        "text": (
            "The grinding activity was completed under the approved procedure "
            "with appropriate protection and personnel maintained outside the hazard area."
        )
    }
]


# ==========================================
# LOAD MODEL
# ==========================================

print("==========================================")
print("      SIF-GUARD UNSEEN DATA TEST")
print("==========================================")

print("\n========== LOADING MODEL ==========")

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME
)

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_PATH
)

model.eval()

print("Model loaded successfully.")


# ==========================================
# DEVICE
# ==========================================

if torch.backends.mps.is_available():
    device = torch.device("mps")
elif torch.cuda.is_available():
    device = torch.device("cuda")
else:
    device = torch.device("cpu")

model.to(device)

print("Device:", device)


# ==========================================
# PREDICTION FUNCTION
# ==========================================

def predict_report(text):

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128
    )

    inputs = {
        key: value.to(device)
        for key, value in inputs.items()
    }

    with torch.no_grad():

        outputs = model(**inputs)

        probabilities = torch.softmax(
            outputs.logits,
            dim=1
        )

    probabilities = probabilities[0]

    predicted_label = torch.argmax(
        probabilities
    ).item()

    confidence = probabilities[
        predicted_label
    ].item()

    label = "YES" if predicted_label == 1 else "NO"

    return label, confidence


# ==========================================
# RUN TEST
# ==========================================

print("\n========== PREDICTIONS ==========")

correct = 0

for report in unseen_reports:

    prediction, confidence = predict_report(
        report["text"]
    )

    is_correct = prediction == report["expected"]

    if is_correct:
        correct += 1

    status = "CORRECT" if is_correct else "WRONG"

    print("\n------------------------------------------")
    print("ID        :", report["id"])
    print("Expected  :", report["expected"])
    print("Predicted :", prediction)
    print("Confidence:", f"{confidence * 100:.2f}%")
    print("Result    :", status)
    print("Report    :", report["text"])


# ==========================================
# SUMMARY
# ==========================================

total = len(unseen_reports)

accuracy = correct / total

print("\n==========================================")
print("          UNSEEN DATA SUMMARY")
print("==========================================")

print("Total reports :", total)
print("Correct       :", correct)
print("Incorrect     :", total - correct)
print("Accuracy      :", f"{accuracy * 100:.2f}%")

print("\n==========================================")
print("       IMPORTANT INTERPRETATION")
print("==========================================")

print(
    "These reports are manually created unseen examples "
    "and are NOT a substitute for authorized OIL data."
)

print(
    "Results should be treated as exploratory validation "
    "of model behavior outside the training/test CSV."
)

print("\n========== TEST COMPLETE ==========")

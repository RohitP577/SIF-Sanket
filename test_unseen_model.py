import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification


# ============================================================
# CONFIG
# ============================================================

MODEL_PATH = "./models/xlm_roberta_sif_v4"


# ============================================================
# LOAD MODEL
# ============================================================

print("\n==========================================")
print("       LOADING TRAINED SIF MODEL")
print("==========================================")

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_PATH
)

model.eval()


# ============================================================
# COMPLETELY NEW / UNSEEN REPORTS
# ============================================================

reports = [

    "A worker entered a confined space without completing gas testing and without a valid entry permit.",

    "During maintenance, the equipment was properly isolated and the isolation was verified before work started.",

    "A vehicle was operated near pedestrians without maintaining the required separation distance.",

    "The crane operator confirmed that the lifting area was barricaded and no personnel entered the suspended-load zone.",

    "Hot work started before the required gas test was completed and the area was declared safe.",

    "The worker used the required fall protection system and the anchorage point was inspected before working at height.",

    "A technician began maintenance on energized equipment before electrical isolation was confirmed.",

    "The team verified isolation, tested for zero energy and then started the maintenance activity.",

    "A worker entered an excavation where the required inspection had not been completed.",

    "The excavation was inspected and found stable before workers entered the area."
]


# ============================================================
# PREDICTION
# ============================================================

print("\n==========================================")
print("       UNSEEN REPORT PREDICTIONS")
print("==========================================\n")


for i, text in enumerate(reports, start=1):

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

    predicted_class = torch.argmax(
        probabilities
    ).item()

    prediction = model.config.id2label[
        predicted_class
    ]

    confidence = probabilities[
        predicted_class
    ].item()

    print(f"Report {i}")
    print("-" * 70)

    print("Text:")
    print(text)

    print("\nPrediction :", prediction)
    print(
        "Confidence : {:.2f}%".format(
            confidence * 100
        )
    )

    print(
        "NO         : {:.2f}%".format(
            probabilities[0].item() * 100
        )
    )

    print(
        "YES        : {:.2f}%".format(
            probabilities[1].item() * 100
        )
    )

    print("\n")


# ============================================================
# COMPLETE
# ============================================================

print("==========================================")
print("       UNSEEN TEST COMPLETE")
print("==========================================")
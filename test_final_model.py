from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

MODEL_PATH = "./models/xlm_roberta_sif_v4_final"

print("Loading final SIF model...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)

model.eval()

# Completely unseen reports
test_reports = [
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

print("\n" + "=" * 60)
print("FINAL UNSEEN TEST")
print("=" * 60)

correct = 0

expected = [
    "YES",
    "NO",
    "YES",
    "NO",
    "YES",
    "NO",
    "YES",
    "NO",
    "YES",
    "NO"
]

for i, text in enumerate(test_reports, 1):

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=256
    )

    with torch.no_grad():
        outputs = model(**inputs)

    probabilities = torch.softmax(outputs.logits, dim=-1)
    prediction_id = torch.argmax(probabilities, dim=-1).item()

    prediction = model.config.id2label[prediction_id]
    confidence = probabilities[0][prediction_id].item() * 100

    is_correct = prediction == expected[i - 1]

    if is_correct:
        correct += 1

    print(f"\n{i}. {text}")
    print(f"   Expected   : {expected[i - 1]}")
    print(f"   Prediction : {prediction}")
    print(f"   Confidence : {confidence:.2f}%")
    print(f"   Result     : {'CORRECT' if is_correct else 'WRONG'}")

print("\n" + "=" * 60)
print("FINAL UNSEEN RESULT")
print("=" * 60)

accuracy = (correct / len(test_reports)) * 100

print(f"Correct : {correct}/{len(test_reports)}")
print(f"Accuracy: {accuracy:.2f}%")
print("=" * 60)
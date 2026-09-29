import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

MODEL_PATH = "./models/xlm_roberta_sif_v4"

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)

model.eval()

texts = [
    "Worker entered a confined space without gas testing and without a valid permit.",
    "Worker worked near an energized line without isolation.",
    "Office employee attended a routine safety meeting.",
    "Worker used required PPE while performing normal maintenance."
]

print("\n==============================")
print("SIF MODEL PREDICTION TEST")
print("==============================\n")

for text in texts:

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=256
    )

    with torch.no_grad():
        outputs = model(**inputs)

    probabilities = torch.softmax(outputs.logits, dim=1)[0]

    predicted_class = torch.argmax(probabilities).item()

    prediction = "NO" if predicted_class == 0 else "YES"

    confidence = probabilities[predicted_class].item()

    print("Report:")
    print(text)
    print("Prediction :", prediction)
    print("Confidence :", round(confidence, 4))
    print("NO probability :", round(probabilities[0].item(), 4))
    print("YES probability:", round(probabilities[1].item(), 4))
    print("-" * 60)
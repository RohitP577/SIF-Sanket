import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

MODEL_NAME = "xlm-roberta-base"

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=2,
    id2label={0: "NO", 1: "YES"},
    label2id={"NO": 0, "YES": 1}
)

model.train()

texts = [
    "Worker entered confined space without authorization.",
    "Worker attended routine office meeting."
]

labels = torch.tensor([1, 0])

inputs = tokenizer(
    texts,
    padding=True,
    truncation=True,
    return_tensors="pt"
)

outputs = model(
    **inputs,
    labels=labels
)

print("Initial loss:", outputs.loss.item())

outputs.loss.backward()

classifier_grad = model.classifier.out_proj.weight.grad

print("Gradient exists:", classifier_grad is not None)

if classifier_grad is not None:
    print("Gradient mean:", classifier_grad.abs().mean().item())
    print("Gradient max :", classifier_grad.abs().max().item())
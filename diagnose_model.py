import torch
from transformers import AutoModelForSequenceClassification

MODEL_PATH = "./models/xlm_roberta_sif_v4"

print("Loading model...")

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_PATH
)

print("\n==============================")
print("MODEL DIAGNOSTIC")
print("==============================")

total_params = sum(
    p.numel()
    for p in model.parameters()
)

trainable_params = sum(
    p.numel()
    for p in model.parameters()
    if p.requires_grad
)

print("Total parameters    :", total_params)
print("Trainable parameters:", trainable_params)

print("\nClassifier:")

if hasattr(model, "classifier"):
    print(model.classifier)

print("\nRequires grad check:")

for name, param in model.named_parameters():
    if "classifier" in name:
        print(
            name,
            "requires_grad=",
            param.requires_grad,
            "shape=",
            tuple(param.shape)
        )

print("\nModel config:")
print("num_labels:", model.config.num_labels)
print("id2label:", model.config.id2label)
print("label2id:", model.config.label2id)
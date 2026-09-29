from transformers import AutoTokenizer, AutoModel
import torch

MODEL_NAME = "xlm-roberta-base"

print("==========================================")
print("       SIF-GUARD MULTILINGUAL TEST")
print("==========================================")

# Load tokenizer
print("\nLoading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

# Load multilingual Transformer
print("Loading XLM-RoBERTa model...")
model = AutoModel.from_pretrained(MODEL_NAME)

print("\n========== MODEL READY ==========")
print("Model:", MODEL_NAME)
print("Hidden size:", model.config.hidden_size)
print("Layers:", model.config.num_hidden_layers)
print("Vocabulary size:", model.config.vocab_size)


# ------------------------------------------
# Test reports
# ------------------------------------------

english_report = """
During compressor maintenance, the worker started the task
without confirming that the energy source had been properly isolated.
"""

hindi_report = """
कंप्रेसर की मरम्मत के दौरान कर्मचारी ने यह सुनिश्चित किए बिना काम शुरू कर दिया
कि ऊर्जा स्रोत को सही तरीके से अलग किया गया है।
"""


reports = {
    "English": english_report,
    "Hindi": hindi_report
}


print("\n========== MULTILINGUAL TRANSFORMER TEST ==========")


for language, text in reports.items():

    print(f"\n--- {language} Report ---")

    # Tokenize report
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=256
    )

    print("Input token count:", inputs["input_ids"].shape[1])

    # Generate Transformer representation
    with torch.no_grad():
        outputs = model(**inputs)

    # Last hidden state
    last_hidden_state = outputs.last_hidden_state

    print("Transformer output shape:",
          tuple(last_hidden_state.shape))

    print("Transformer processing: SUCCESS")


print("\n========== TEST COMPLETE ==========")
print("XLM-RoBERTa successfully processed English and Hindi reports.")
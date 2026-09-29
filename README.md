# SIF-Sanket

AI/NLP Engine for detecting Serious Injury & Fatality (SIF) precursors in safety reports.

## Project Overview

SIF-Sanket is an AI/NLP-based safety intelligence system designed to analyze free-text safety reports and identify reports that may contain Serious Injury & Fatality (SIF) potential.

### Intended Flow

Safety Report  
→ NLP Processing  
→ SIF-Potential Classification  
→ Safety Intelligence  
→ HSE Priority Dashboard

## Current Status

### Completed

- Synthetic safety-report dataset v2 created and audited.
- v2 dataset was found to contain severe duplicate leakage.
- New v3 dataset generated.
- v3 contains 1,500 reports:
  - 750 YES
  - 750 NO
- Exact duplicate check: 0
- Normalized duplicate check: 0
- Cross-label structure collision: 0
- XLM-RoBERTa-base fine-tuned for binary SIF classification.
- Proper train/validation/final-test split used.
- Trained model saved locally at:

```text
models/xlm_roberta_sif_v3

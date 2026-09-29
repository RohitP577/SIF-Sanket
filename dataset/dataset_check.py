import pandas as pd

# Load dataset
file_path = "dataset/sif_sanket_synthetic_safety_reports_v2_1000.csv"

df = pd.read_csv(file_path)

print("========== DATASET OVERVIEW ==========")

# Total rows and columns
print("Rows:", df.shape[0])
print("Columns:", df.shape[1])

print("\n========== COLUMN NAMES ==========")
print(df.columns.tolist())

print("\n========== MISSING VALUES ==========")
print(df.isnull().sum())

print("\n========== DUPLICATE ROWS ==========")
print("Duplicate rows:", df.duplicated().sum())

print("\n========== SIF POTENTIAL ==========")
print(df["sif_potential"].value_counts())

print("\n========== REPORT TYPE ==========")
print(df["report_type"].value_counts())

print("\n========== LIFE-SAVING RULE ==========")
print(df["life_saving_rule"].value_counts())

print("\n========== SAMPLE RECORDS ==========")
print(df.head(5))
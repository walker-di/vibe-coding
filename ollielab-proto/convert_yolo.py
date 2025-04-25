import os
from ultralytics import YOLO

# Define the directory containing the models
model_dir = "static/mediapipe"

# List all files in the directory
try:
    all_files = os.listdir(model_dir)
except FileNotFoundError:
    print(f"Error: Directory not found at {model_dir}")
    exit()

# Filter for .pt files
pt_files = [f for f in all_files if f.endswith(".pt")]

if not pt_files:
    print(f"No .pt files found in {model_dir}")
    exit()

print(f"Found {len(pt_files)} .pt files to convert in {model_dir}:")
for filename in pt_files:
    print(f"- {filename}")

# Loop through each .pt file and convert it
for filename in pt_files:
    pt_path = os.path.join(model_dir, filename)
    print(f"\nProcessing {filename}...")
    try:
        # Load the YOLO model
        model = YOLO(pt_path)

        # Export the model to ONNX format
        # The output file will be saved in the same directory with a .onnx extension
        model.export(format="onnx")

        print(f"Successfully converted {filename} to ONNX format.")
    except Exception as e:
        print(f"Error converting {filename}: {e}")

print("\nConversion process finished.")

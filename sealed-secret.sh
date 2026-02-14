#!/bin/bash

# Script to seal Kubernetes secrets using kubeseal
# Usage: ./sealed-secret.sh <secret-file.yaml>

# Kubeseal controller configuration
CONTROLLER_NAME="sealed-secrets-controller"
CONTROLLER_NAMESPACE="kube-system"

set -e

# Check if argument is provided
if [ $# -eq 0 ]; then
  echo "Error: No input file specified"
  echo "Usage: $0 <secret-file.yaml>"
  exit 1
fi

INPUT_FILE="$1"

# Validate input file exists
if [ ! -f "$INPUT_FILE" ]; then
  echo "Error: File '$INPUT_FILE' not found"
  exit 1
fi

# Validate input file has .yaml or .yml extension
if [[ ! "$INPUT_FILE" =~ \.(yaml|yml)$ ]]; then
  echo "Warning: Input file does not have .yaml or .yml extension"
fi

# Generate output filename
BASENAME="${INPUT_FILE%.*}"
OUTPUT_FILE="${BASENAME}-sealed.yaml"

echo "Sealing secret from: $INPUT_FILE"
echo "Output file: $OUTPUT_FILE"

# Run kubeseal command
if kubeseal --format=yaml \
  --controller-name="$CONTROLLER_NAME" \
  --controller-namespace="$CONTROLLER_NAMESPACE" \
  < "$INPUT_FILE" > "$OUTPUT_FILE"; then
  
  echo "✓ Successfully created sealed secret: $OUTPUT_FILE"
  
  # Prompt user to delete original file
  echo ""
  read -p "Do you want to delete the original file '$INPUT_FILE'? (y/N): " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm "$INPUT_FILE"
    echo "✓ Deleted original file: $INPUT_FILE"
  else
    echo "Original file kept: $INPUT_FILE"
  fi
else
  echo "✗ Error: Failed to seal secret"
  exit 1
fi
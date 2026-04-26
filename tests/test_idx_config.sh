#!/bin/bash

# Simple test script for .idx/dev.nix

DEV_NIX=".idx/dev.nix"

if [ ! -f "$DEV_NIX" ]; then
  echo "Error: $DEV_NIX does not exist."
  exit 1
fi

echo "Checking $DEV_NIX for required configurations..."

# Check for packages
grep -q "pkgs.nodejs_20" "$DEV_NIX" || { echo "Missing pkgs.nodejs_20"; exit 1; }
grep -q "pkgs.corepack_20" "$DEV_NIX" || { echo "Missing pkgs.corepack_20"; exit 1; }
grep -q "pkgs.nodePackages.npm" "$DEV_NIX" || { echo "Missing pkgs.nodePackages.npm"; exit 1; }

# Check for previews
grep -q "idx =" "$DEV_NIX" || { echo "Missing idx configuration"; exit 1; }
grep -q "previews =" "$DEV_NIX" || { echo "Missing previews configuration"; exit 1; }
grep -q "enable = true;" "$DEV_NIX" || { echo "Missing enable = true in previews"; exit 1; }
grep -q "\"pnpm\"" "$DEV_NIX" || { echo "Missing pnpm in command"; exit 1; }
grep -q "\"run\"" "$DEV_NIX" || { echo "Missing run in command"; exit 1; }
grep -q "\"dev\"" "$DEV_NIX" || { echo "Missing dev in command"; exit 1; }

# Check for lifecycle hooks
grep -q "lifecycle =" "$DEV_NIX" || { echo "Missing lifecycle"; exit 1; }
grep -q "onCreate =" "$DEV_NIX" || { echo "Missing onCreate"; exit 1; }
grep -q "\"pnpm-install\" = \"pnpm install\";" "$DEV_NIX" || { echo "Missing pnpm-install hook"; exit 1; }

# Check for duplicate structure (simple check)
if [ $(grep -c "channel = \"stable-23.11\";" "$DEV_NIX") -gt 1 ]; then
  echo "Error: Duplicate configuration detected."
  exit 1
fi

echo "All basic configuration checks passed!"
exit 0

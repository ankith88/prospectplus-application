---
description: Local-Only Sequential Batch Merger
---

# Workflow: Local-Only Sequential Batch Merger

This workflow pulls the latest main stream and loops through your dev branches to combine them strictly on your local machine for verification.

## Parameters
- **Branch List String:** {{args.[0]}} (Fail validation if empty)

## Automated Actions Sequence
1. **Prepare Main Baseline:**
   ```bash
   git stash
   git checkout main
   git pull origin main
   ```

2. **Merge Dev Branches Sequentially:**
   Merge each dev branch locally, avoiding pushes so it can be verified on localhost:
   ```bash
   for branch in {{args.[0]}}; do
     git merge --no-ff --no-edit "$branch"
   done
   ```

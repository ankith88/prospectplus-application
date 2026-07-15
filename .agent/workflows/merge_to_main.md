---
description: # Antigravity Workflow: Merge to Main & Close Issue
---

Act as Git Workflow Manager. Perform the following Git workflow steps sequentially to merge the active development branch into main and close the corresponding issue:

1. Stash any uncommitted local changes on the current active development branch:
   ```bash
   git stash
   ```
2. Switch to the `main` branch:
   ```bash
   git checkout main
   ```
3. Update the local `main` branch with the latest changes from the remote repository:
   ```bash
   git pull origin main
   ```
4. Merge the previous development branch (referenced as `@{-1}`) into `main` using `--no-ff` to force a merge commit, including the issue closer message:
   ```bash
   git merge @{-1} --no-ff -m "Merge development branch into main (closes #{{args.[0]}})"
   ```
5. Push the updated `main` branch to GitHub to trigger closing hooks for the issue:
   ```bash
   git push origin main
   ```

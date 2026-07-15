---
description: # Antigravity Workflow: Close Issue
---

Act as Git Workflow Manager. Perform the following Git workflow steps sequentially:
1. Stage all modified changes:
   ```bash
   git add -u
   ```
2. Commit the changes cleanly with a message that includes the custom description and links to the issue:
   ```bash
   git commit -m "{{args.[1]}} (closes #{{args.[0]}})"
   ```
3. Push the active local branch upstream:
   ```bash
   git push origin HEAD
   ```

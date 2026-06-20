import os
import re

app_dir = "/Users/ankithravindran/Development/Antigravity/prospectplus-application/src"

def process_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    # If it contains an access check redirect pattern
    if "router.replace" in content or "router.push" in content:
        # Check if it's doing something like: if (!loading && !hasAccess) router.replace(...)
        if "hasAccess" in content or "allowedRoles" in content or "canView" in content:
            pass


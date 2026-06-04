const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            callback(dirPath);
        }
    });
}

let modifiedFiles = 0;

walkDir('./src', (filePath) => {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    let content = originalContent;

    // 1. userProfile.role -> userProfile.activeRole
    content = content.replace(/userProfile\?\.role/g, 'userProfile?.activeRole');
    content = content.replace(/userProfile\.role/g, 'userProfile.activeRole');
    
    // 2. Destructured { role } from userProfile -> handled manually if needed, but let's check
    // In our grep search, { role } wasn't commonly destructured from userProfile.

    // 3. u.role === 'Role' -> u.assignedRoles?.includes('Role')
    // This regex looks for:  <var>.role === '<string>'
    // where <var> is u, user, rep, member
    content = content.replace(/\b(u|user|rep|member)\.role\s*===\s*('([^']+)')/g, '$1.assignedRoles?.includes($2)');
    content = content.replace(/\b(u|user|rep|member)\.role\s*!==\s*('([^']+)')/g, '!$1.assignedRoles?.includes($2)');

    // 4. Also handle ['admin', 'user'].includes(u.role)
    // -> u.assignedRoles?.some(r => ['admin', 'user'].includes(r))
    // We will do a generic replacement for this if it exists.
    // e.g. ['user', 'admin'].includes(u.role || '')
    content = content.replace(/(\[[^\]]+\])\.includes\((u|user|rep|member)\.role(?:\s*\|\|\s*'')?\)/g, '$2.assignedRoles?.some(r => $1.includes(r))');

    // 5. {user.role} in JSX
    content = content.replace(/\{user\.role(?:\s*\|\|\s*'[^']*')?\}/g, '{user.defaultRole}');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        modifiedFiles++;
        console.log(`Modified: ${filePath}`);
    }
});

console.log(`Total files modified: ${modifiedFiles}`);

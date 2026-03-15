import os
import re

base_dir = r'C:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN\server\src'
shared_files = ['redis', 'supabase', 'logger', 'mongo', 'config', 'validation', 'env']

def fix_imports(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    rel_to_src = os.path.relpath(file_path, base_dir)
    depth = len(rel_to_src.split(os.sep)) - 1
    
    if depth == 0:
        return # Skip files in root of server/src (env.js etc)

    changed = False
    for sf in shared_files:
        # Pattern like from '../logger.js' or from "../logger.js"
        # We need to change '../' to '../../shared/' if it was previously at depth 1
        # But wait, it's easier to just check where the file is now.
        
        # If it was at server/src/X/Y.js, it imported from ../sf.js
        # Now it is at server/src/api/X/Y.js, so it needs ../../shared/sf.js
        
        # Let's just find any import of the shared files and re-calculate.
        # We look for imports from '../*.js' where * is a shared file.
        
        # Simple approach: If the file is in api/ or signaling/, and it's importing from '../X.js',
        # it was likely intended to reach server/src/X.js.
        # So we replace '../' with '../../shared/' for files in api/A/ or signaling/A/
        
        up_prefix = '../' * depth
        new_path = f'{up_prefix}shared/{sf}.js'
        
        # Match from '../sf.js' or from "../sf.js"
        pattern = rf'from\s+[\'\"]\.\./{sf}\.js[\'\"]'
        replacement = f"from '{new_path}'"
        
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            changed = True
            
    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed imports in {rel_to_src}")

for root, dirs, files in os.walk(base_dir):
    if 'node_modules' in dirs:
        dirs.remove('node_modules')
    for file in files:
        if file.endswith('.js'):
            fix_imports(os.path.join(root, file))

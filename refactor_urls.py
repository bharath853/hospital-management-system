import os
import re

API_BASE_DEF = "const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';"

def process_file(filepath, has_existing_api_base=False):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if has_existing_api_base:
        content = re.sub(r"const API_BASE = 'http://127.0.0.1:8000.*?';", API_BASE_DEF, content)
    else:
        # For App.jsx, insert after imports
        if 'App.jsx' in filepath:
            last_import = content.rfind("import ")
            end_of_last_import = content.find("\n", last_import) + 1
            content = content[:end_of_last_import] + "\n" + API_BASE_DEF + "\n" + content[end_of_last_import:]

    # Replace 'http://127.0.0.1:8000...' with `${API_BASE}...`
    # Match single quotes first
    def replacer_single(m):
        rest = m.group(1)
        return f"`${{API_BASE}}{rest}`"
    
    # Match backticks
    def replacer_backtick(m):
        rest = m.group(1)
        return f"${{API_BASE}}{rest}"

    content = re.sub(r"'http://127.0.0.1:8000([^']*)'", replacer_single, content)
    content = re.sub(r"http://127.0.0.1:8000([^`]*)", replacer_backtick, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

src_dir = r"c:\Users\Asus\Downloads\Hospital_app\Hospital_app\hms-frontend\src"
app_jsx = os.path.join(src_dir, "App.jsx")
lab_page = os.path.join(src_dir, "pages", "Laboratory", "LabSectionsPage.jsx")
dashboard = os.path.join(src_dir, "pages", "Admin", "Dashboard.jsx")
admin_portal = os.path.join(src_dir, "pages", "Admin", "AdminPortalPage.jsx")

process_file(app_jsx, has_existing_api_base=False)
process_file(lab_page, has_existing_api_base=True)
process_file(dashboard, has_existing_api_base=True)
process_file(admin_portal, has_existing_api_base=True)

print("Refactoring complete.")

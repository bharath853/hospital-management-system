import os
import re

WS_BASE_DEF = "const WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000';"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Avoid duplicate definitions
    if 'const WS_URL =' not in content:
        # Try inserting right after API_BASE
        api_base_idx = content.find("const API_BASE =")
        if api_base_idx != -1:
            end_of_api_base = content.find(";", api_base_idx) + 1
            content = content[:end_of_api_base] + "\n" + WS_BASE_DEF + content[end_of_api_base:]
        else:
            # Fallback to after last import
            last_import = content.rfind("import ")
            end_of_last_import = content.find("\n", last_import) + 1
            content = content[:end_of_last_import] + "\n" + WS_BASE_DEF + "\n" + content[end_of_last_import:]

    # Replace string literals
    # We want to replace 'ws://127.0.0.1:8000...' with `${WS_URL}...`
    # Match single quotes
    def replacer_single(m):
        rest = m.group(1)
        return f"`${{WS_URL}}{rest}`"
    
    # Match backticks
    def replacer_backtick(m):
        rest = m.group(1)
        return f"${{WS_URL}}{rest}"

    content = re.sub(r"'ws://127.0.0.1:8000([^']*)'", replacer_single, content)
    content = re.sub(r"ws://127.0.0.1:8000([^`]*)", replacer_backtick, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

src_dir = r"c:\Users\Asus\Downloads\Hospital_app\Hospital_app\hms-frontend\src"
app_jsx = os.path.join(src_dir, "App.jsx")
lab_page = os.path.join(src_dir, "pages", "Laboratory", "LabSectionsPage.jsx")

process_file(app_jsx)
process_file(lab_page)

print("WebSocket URLs Refactored.")

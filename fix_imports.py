import os, glob, re

possible_icons = set([
    'Search', 'Plus', 'Calendar', 'Activity', 'ChevronRight', 'CheckCircle2', 'UserPlus', 'AlertCircle', 'X', 'Download', 
    'FileText', 'Settings', 'RefreshCw', 'HeartPulse', 'Clock', 'Filter', 'CreditCard', 'UserCheck', 'Printer', 'Phone',
    'Mail', 'MapPin', 'CheckCircle', 'AlertTriangle', 'FilePlus', 'User', 'Users', 'ClipboardList', 'Stethoscope',
    'Syringe', 'Bed', 'Building', 'DoorOpen', 'ArrowRight', 'ArrowLeft', 'MoreVertical', 'MoreHorizontal', 'Eye', 'Edit',
    'Trash', 'Trash2', 'Save', 'Check', 'Smartphone', 'Banknote'
])

for file_path in glob.glob('hms-frontend/src/pages/Reception/*.jsx'):
    if os.path.basename(file_path) not in ['PatientRegistration.jsx', 'AppointmentBooking.jsx', 'QueueManagement.jsx', 'OPIPRegistration.jsx']:
        continue

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    used_components = set(re.findall(r'<([A-Z][a-zA-Z0-9]+)', content))
    needed_icons = used_components.intersection(possible_icons)
    
    new_import = 'import { ' + ', '.join(needed_icons) + ' } from \'lucide-react\';'
    
    content = re.sub(r'import\s+\{[^}]*\}\s+from\s+[\'"]lucide-react[\'"];', new_import, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f'Fixed imports in {os.path.basename(file_path)}: {needed_icons}')

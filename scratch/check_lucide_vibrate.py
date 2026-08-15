import re

with open(r'c:\Users\DrCreative xeon\Downloads\quran-light-app (4)\node_modules\lucide-react\dist\lucide-react.d.ts', 'r', encoding='utf-8') as f:
    content = f.read()

print("Vibrate in lucide:", 'Vibrate' in content)
print("VibrateOff in lucide:", 'VibrateOff' in content)
print("Smartphone in lucide:", 'Smartphone' in content)

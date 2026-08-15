import os
import json
import re

jalalayn_path = r'c:\Users\DrCreative xeon\Downloads\quran-light-app (4)\public\ar.jalalayn.txt'

with open(jalalayn_path, 'r', encoding='utf-8') as f:
    text = f.read()

blocks = text.split('--------------------------------------------------')

print(f"Total blocks found in Jalalayn file: {len(blocks)}")

parsed_by_surah = {}

# Map surah names to numbers 1 to 114
current_surah_num = 1
last_surah_name = None

for block in blocks:
    block = block.strip()
    if not block:
        continue
    
    surah_match = re.search(r'السورة:\s*([^|]+)\|\s*الآية:\s*(\d+)', block)
    text_match = re.search(r'نص الآية:\s*(.+)', block)
    tafsir_match = re.search(r'التفسير:\s*(.+)', block, re.DOTALL)
    
    if surah_match and text_match and tafsir_match:
        surah_name = surah_match.group(1).strip()
        ayah_num = int(surah_match.group(2).strip())
        verse_text = text_match.group(1).strip()
        tafsir_text = tafsir_match.group(1).strip()

        if last_surah_name is not None and surah_name != last_surah_name:
            current_surah_num += 1
        last_surah_name = surah_name

        if current_surah_num not in parsed_by_surah:
            parsed_by_surah[current_surah_num] = []

        parsed_by_surah[current_surah_num].append({
            'ayah': ayah_num,
            'text': verse_text,
            'tafsir': tafsir_text
        })

print(f"Parsed surahs count: {len(parsed_by_surah)}")
print(f"Surah 1 ayahs: {len(parsed_by_surah.get(1, []))}")
print(f"Surah 2 ayahs: {len(parsed_by_surah.get(2, []))}")
print(f"Surah 114 ayahs: {len(parsed_by_surah.get(114, []))}")

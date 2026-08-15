import json
import os

quran_json_path = r'c:\Users\DrCreative xeon\Downloads\quran-light-app (4)\public\quran.json'
surahs_json_path = r'c:\Users\DrCreative xeon\Downloads\quran-light-app (4)\src\data\surahs.json'

verses_ts_path = r'c:\Users\DrCreative xeon\Downloads\quran-light-app (4)\src\data\verses.ts'
quran_cards_ts_path = r'c:\Users\DrCreative xeon\Downloads\quran-light-app (4)\src\data\quranCardsVerses.ts'

with open(quran_json_path, 'r', encoding='utf-8') as f:
    quran_data = json.load(f)['quran']

with open(surahs_json_path, 'r', encoding='utf-8') as f:
    surahs_meta = json.load(f)

# Map surah index to clean surah name from surahs.json
surah_name_map = {s['id']: s['name'] for s in surahs_meta}

daily_verses = []
card_verses = []
global_id = 1

for surah in quran_data:
    surah_id = surah['index']
    surah_clean_name = surah_name_map.get(surah_id, surah['name'])

    for aya in surah['ayas']:
        text = aya['text']
        # If aya 1 of non-Fatiha/Tawbah, prepend bismillah if present
        if surah_id != 1 and surah_id != 9 and aya['index'] == 1 and 'bismillah' in aya:
            full_text = f"{aya['bismillah']} {text}"
        else:
            full_text = text

        daily_verses.append({
            "text": full_text,
            "surahName": surah_clean_name,
            "reference": f"الآية {aya['index']}"
        })

        card_verses.append({
            "id": global_id,
            "text": full_text,
            "surahName": surah_clean_name,
            "ayah": str(aya['index'])
        })
        global_id += 1

print(f"Total Ayahs processed: {len(daily_verses)}")

# 1. Write src/data/verses.ts
with open(verses_ts_path, 'w', encoding='utf-8') as f:
    f.write("import { DailyVerse } from '../types';\n\n")
    f.write("export const PRESET_VERSES: DailyVerse[] = ")
    json.dump(daily_verses, f, ensure_ascii=False, indent=2)
    f.write(";\n")

# 2. Write src/data/quranCardsVerses.ts
with open(quran_cards_ts_path, 'w', encoding='utf-8') as f:
    f.write("export interface QuranCardVerse {\n  id: number;\n  text: string;\n  surahName: string;\n  ayah: string;\n}\n\n")
    f.write("export const QURAN_CARDS_VERSES: QuranCardVerse[] = ")
    json.dump(card_verses, f, ensure_ascii=False, indent=2)
    f.write(";\n")

print("Successfully updated src/data/verses.ts and src/data/quranCardsVerses.ts from public/quran.json!")

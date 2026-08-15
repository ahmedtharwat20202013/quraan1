import json

quran_json_path = r'c:\Users\DrCreative xeon\Downloads\quran-light-app (4)\public\quran.json'
with open(quran_json_path, 'r', encoding='utf-8') as f:
    quran_data = json.load(f)['quran']

def to_arabic_digits(num):
    arabic_digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
    return ''.join(arabic_digits[int(d)] for d in str(num))

def get_surah_words(surah):
    words = []
    for aya in surah['ayas']:
        text = aya['text']
        if surah['index'] not in (1, 9) and aya['index'] == 1:
            text = text.replace("بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ", "").strip()
        tokens = [w for w in text.split() if w]
        for idx, token in enumerate(tokens):
            words.append({'text': token, 'isVerseEnd': False, 'aya': aya['index']})
            if idx == len(tokens) - 1:
                words.append({'text': f"﴿{to_arabic_digits(aya['index'])}﴾", 'isVerseEnd': True, 'aya': aya['index']})
    return words

total_words = 0
for surah in quran_data:
    words = get_surah_words(surah)
    total_words += len(words)

print(f"Total words across all 114 surahs: {total_words}")

"""Create localized narrated walkthroughs from private-free demo app captures."""

import base64
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
STORE = ROOT / "media" / "store"
OUT = ROOT / "media" / "video"
OUT.mkdir(parents=True, exist_ok=True)
FONT = "C:/Windows/Fonts/segoeui.ttf"
BOLD = "C:/Windows/Fonts/segoeuib.ttf"
W, H = 1920, 1080


def scenes(language):
    if language == "tr":
        return [
            ("Roomora ile net hesap", "Evde ve gezide ortak harcamaları tek yerde gör.", "Roomora'da ev veya gezi grubunu açarak başla. Ana sayfada toplam borcunu, alacağını ve son işlemleri görürsün.", "home-tr-01-home.png"),
            ("Harcamayı ekle", "Tutarı, adı ve kategoriyi gir.", "Harcama Ekle ekranında örneğin haftalık market için dokuz yüz altmış lira yaz. Harcama adını ve market kategorisini seç.", "home-tr-03-add-expense.png"),
            ("Kim ödedi? Kimler paylaşıyor?", "Yalnız ilgili kişileri seç; pay otomatik hesaplanır.", "Ödeyen kişiyi seç. Sonra harcamanın kimler için olduğunu belirle. Bu örnekte Deniz ödüyor, Ece ve Mert eşit paylaşıyor. Kişi başı dört yüz seksen lira. Deniz paylaşıma dahil değil.", "home-tr-07-selected-split.png"),
            ("Kaydetmeden önce kontrol et", "Seçimler formda görünür; kayıt sen onaylayınca oluşur.", "Tutarı, kategoriyi, ödeyeni ve katılımcıları kontrol et. Harcama ancak ekleme düğmesine bastığında kaydedilir. Sonra gider geçmişinde görünür.", "home-tr-02-expenses.png"),
            ("Faturaları takip et", "Ödenen faturayı ayrı, kişi borcunu ayrı gör.", "Elektrik, su, internet ve kira gibi giderler fatura ekranında toplanır. Fatura kuruma ödense bile ev arkadaşları arasındaki paylar borç olarak izlenir.", "home-tr-05-bills.png"),
            ("Kimin kime borcu var?", "Net bakiye ve kişi bazlı durum tek ekranda.", "Borç Alacak Özeti ekranında net durumunu ve kişi bazında açık bakiyeleri gör. Örneğin Ece'ye yedi yüz on lira borcun, Mert'ten dört yüz yirmi lira alacağın var.", "home-tr-04-balance.png"),
            ("Ödeme bildir ve onaylat", "Kısmi veya tam tutarı seç; karşı taraf onaylar.", "Ödeme Yap ekranında borçlu olduğun kişiyi ve tutarı seçip ödemeyi bildir. Bu bir banka transferi değildir. Karşı taraf uygulamadaki bildirimi onayladığında bakiye güncellenir.", "home-tr-06-payment.png"),
            ("Gezi için de kullan", "Otel, yemek ve ulaşımı aynı mantıkla bölüş.", "Roomora yalnız ev arkadaşları için değil. Gezi grubu kurup otel, yemek ve ulaşım harcamalarını kaydet. Her harcamayı sadece ilgili arkadaşlarla paylaş.", "trip-tr-02-expenses.png"),
        ]
    return [
        ("Clear shared balances", "Track shared spending at home or on a trip.", "Start by opening a home or trip group in Roomora. The home screen shows your balance, what you owe, what others owe you, and recent activity.", "home-en-01-home.png"),
        ("Add an expense", "Enter the amount, name, and category.", "On Add Expense, enter nine hundred and sixty lira for weekly groceries. Then choose a clear name and the groceries category.", "home-en-03-add-expense.png"),
        ("Choose the payer and participants", "Split only with the people involved.", "Choose who paid, then select who shares the expense. Here Deniz paid, while Ece and Mert split it equally. Each owes four hundred and eighty lira. Deniz is not included in this split.", "home-en-07-selected-split.png"),
        ("Review before saving", "Nothing is recorded until you confirm.", "Check the amount, category, payer, and participants. The expense is recorded only when you tap the add button. You can then find it in Expense History.", "home-en-02-expenses.png"),
        ("Track household bills", "Keep paid bills separate from member balances.", "Electricity, water, internet, and rent appear together under Bills. A bill can be paid to the provider while a member's share remains outstanding inside the group.", "home-en-05-bills.png"),
        ("See who owes whom", "Your net and person-by-person balances are clear.", "Balance Summary shows your net position and every open balance. In this example you owe Ece seven hundred and ten lira, and Mert owes you four hundred and twenty.", "home-en-04-balance.png"),
        ("Report and approve payments", "Choose a full or partial amount.", "In Make Payment, choose the person and amount, then report the payment. Roomora does not transfer money. The other person approves the report in the app, and the balance updates after approval.", "home-en-06-payment.png"),
        ("Take it on a trip", "Split hotels, meals, and transport too.", "Roomora is not only for roommates. Create a trip group and record the hotel, meals, or airport transfer. Share each expense only with the friends involved.", "trip-en-02-expenses.png"),
    ]


def voice_to_wav(text, lang, path):
    voice = "Microsoft Tolga" if lang == "tr" else "Microsoft Zira"
    escaped_text = text.replace("'", "''")
    escaped_path = str(path).replace("'", "''")
    script = (
        "Add-Type -AssemblyName System.Speech; "
        "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        f"$s.SelectVoice('{voice}'); $s.Rate=0; "
        f"$s.SetOutputToWaveFile('{escaped_path}'); "
        f"$s.Speak('{escaped_text}'); $s.Dispose()"
    )
    encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
    subprocess.run(["powershell", "-NoProfile", "-EncodedCommand", encoded], check=True, capture_output=True)


def wrap(draw, text, font, max_width):
    lines, current = [], ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if current and draw.textbbox((0, 0), candidate, font=font)[2] > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def slide(index, title, subtitle, image_name, path):
    image = Image.new("RGB", (W, H), "#F7F9FC")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 18, H), fill="#286593")
    draw.text((95, 70), "Roomora", font=ImageFont.truetype(BOLD, 46), fill="#182C3C")
    draw.text((95, 202), f"{index:02d} / 08", font=ImageFont.truetype(BOLD, 31), fill="#286593")
    y = 290
    for line in wrap(draw, title, ImageFont.truetype(BOLD, 76), 1060):
        draw.text((95, y), line, font=ImageFont.truetype(BOLD, 76), fill="#182C3C")
        y += 92
    y += 28
    for line in wrap(draw, subtitle, ImageFont.truetype(FONT, 42), 1060):
        draw.text((95, y), line, font=ImageFont.truetype(FONT, 42), fill="#526675")
        y += 62
    draw.rectangle((95, 970, 1115, 978), fill="#D6E3EB")
    draw.rectangle((95, 970, 95 + 1020 * index / 8, 978), fill="#286593")
    shot = Image.open(STORE / image_name).convert("RGB")
    shot.thumbnail((720, 1030), Image.Resampling.LANCZOS)
    x = 1200 + (720 - shot.width) // 2
    image.paste(shot, (x, (H - shot.height) // 2))
    image.save(path, quality=95)


for lang in ("tr", "en"):
    segments = []
    for index, (title, subtitle, narration, screenshot) in enumerate(scenes(lang), 1):
        still = OUT / f"{lang}-{index:02d}.png"
        wav = OUT / f"{lang}-{index:02d}.wav"
        mp4 = OUT / f"{lang}-{index:02d}.mp4"
        slide(index, title, subtitle, screenshot, still)
        voice_to_wav(narration, lang, wav)
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", "12", "-i", str(still),
            "-i", str(wav), "-c:v", "libx264", "-preset", "ultrafast", "-crf", "25", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", str(mp4),
        ], check=True)
        segments.append(mp4)
    playlist = OUT / f"{lang}-concat.txt"
    playlist.write_text("".join(f"file '{path.as_posix()}'\n" for path in segments), encoding="utf-8")
    final = OUT / f"roomora-guide-{lang}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(playlist), "-c", "copy", "-movflags", "+faststart", str(final)], check=True)
    print(final)

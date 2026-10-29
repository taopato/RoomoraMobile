"""Build a print-ready A5 Roomora flyer with store QR codes."""

from pathlib import Path

import qrcode
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "media" / "brochure"
OUT.mkdir(parents=True, exist_ok=True)
PDF = OUT / "roomora-a5-tr.pdf"
IOS_URL = "https://apps.apple.com/app/id6800784560"
ANDROID_URL = "https://play.google.com/store/apps/details?id=com.taopato.roomora"
FONT_DIR = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Segoe", str(FONT_DIR / "segoeui.ttf")))
pdfmetrics.registerFont(TTFont("SegoeBold", str(FONT_DIR / "segoeuib.ttf")))
MM = 72 / 25.4
W, H = 148 * MM, 210 * MM
NAVY = colors.HexColor("#182C3C")
BLUE = colors.HexColor("#286593")
PALE = colors.HexColor("#EAF3F8")
MUTED = colors.HexColor("#526675")
GREEN = colors.HexColor("#85D3BF")
GOLD = colors.HexColor("#E3BB75")
WHITE = colors.white


def qr(url, name):
    code = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=16, border=4)
    code.add_data(url)
    code.make(fit=True)
    image = code.make_image(fill_color="#182C3C", back_color="white").convert("RGB")
    image.save(OUT / name)
    return ImageReader(image)


def label(c, x, y, value, size=10, color=NAVY, font="Segoe"):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x * MM, H - y * MM, value)


def phone(c, image_path, x, top, width):
    height = width * 16 / 9
    c.setFillColor(colors.HexColor("#0B1B29"))
    c.roundRect((x - 0.8) * MM, (H / MM - top - height - 1.6) * MM,
                (width + 2.2) * MM, (height + 2.2) * MM, 2.5 * MM,
                fill=1, stroke=0)
    c.drawImage(ImageReader(str(image_path)), x * MM,
                (H / MM - top - height) * MM, width * MM, height * MM,
                mask="auto")


ios = qr(IOS_URL, "roomora-ios-qr.png")
android = qr(ANDROID_URL, "roomora-android-qr.png")
c = canvas.Canvas(str(PDF), pagesize=(W, H), pageCompression=1)
c.setTitle("Roomora | Ortak harcamalar, net hesaplar")
c.setAuthor("Roomora")
c.setFillColor(WHITE)
c.rect(0, 0, W, H, fill=1, stroke=0)
c.setFillColor(NAVY)
c.rect(0, H - 130 * MM, W, 130 * MM, fill=1, stroke=0)
c.drawImage(ImageReader(str(ROOT / "src" / "assets" / "mark-white.png")),
            13 * MM, H - 31 * MM, 20 * MM, 20 * MM,
            mask="auto", preserveAspectRatio=True)
label(c, 36, 21, "ROOMORA", 22, WHITE, "SegoeBold")
label(c, 36, 28, "Birlikte harca. Net hesaplaş.", 8.2, colors.HexColor("#CFDDE6"))
c.setStrokeColor(colors.HexColor("#40596C"))
c.line(13 * MM, H - 37 * MM, 135 * MM, H - 37 * MM)

label(c, 13, 48, "EVDE VE GEZİDE", 8.5, GREEN, "SegoeBold")
label(c, 13, 61, "Kim ne ödedi,", 18, WHITE, "SegoeBold")
label(c, 13, 71, "kim ne kadar", 18, WHITE, "SegoeBold")
label(c, 13, 81, "borçlu?", 18, WHITE, "SegoeBold")
label(c, 13, 94, "Kira, fatura, otel ve yemek:", 8.3, colors.HexColor("#D9E5EB"))
label(c, 13, 100, "her harcama ilgili kişilerle", 8.3, colors.HexColor("#D9E5EB"))
label(c, 13, 106, "paylaşılır, bakiye açık kalır.", 8.3, colors.HexColor("#D9E5EB"))

c.setFillColor(GOLD)
c.roundRect(13 * MM, H - 120 * MM, 23 * MM, 8 * MM, 2 * MM, fill=1, stroke=0)
label(c, 17, 117.5, "EV", 7.8, NAVY, "SegoeBold")
c.setFillColor(GREEN)
c.roundRect(39 * MM, H - 120 * MM, 26 * MM, 8 * MM, 2 * MM, fill=1, stroke=0)
label(c, 43, 117.5, "GEZİ", 7.8, NAVY, "SegoeBold")

phone(c, ROOT / "media" / "store-native" / "android" / "home-tr-01-home.png", 80, 42, 47)
phone(c, ROOT / "media" / "store-native" / "android" / "trip-tr-03-expenses.png", 107, 76, 30)

c.setFillColor(BLUE)
c.rect(0, H - 131.5 * MM, W, 1.5 * MM, fill=1, stroke=0)
label(c, 13, 143, "Grubunu kur, hesabı birlikte gör.", 13, NAVY, "SegoeBold")
label(c, 13, 150, "Ücretsiz indir. Telefonuna uygun kodu okut.", 8.4, MUTED)

for x, image, title, url in ((13, ios, "iPhone / App Store", IOS_URL),
                             (79, android, "Android / Google Play", ANDROID_URL)):
    c.setFillColor(PALE)
    c.roundRect(x * MM, H - 201 * MM, 56 * MM, 44 * MM, 2 * MM, fill=1, stroke=0)
    c.drawImage(image, (x + 11) * MM, H - 194 * MM, 34 * MM, 34 * MM, mask="auto")
    c.setFillColor(NAVY)
    c.setFont("SegoeBold", 8.2)
    c.drawCentredString((x + 28) * MM, H - 199 * MM, title)
    c.linkURL(url, (x * MM, H - 201 * MM, (x + 56) * MM, H - 157 * MM), relative=0)

label(c, 13, 206, "roomora  /  takosware.com", 7.2, MUTED)
c.setFillColor(BLUE)
c.rect(0, 0, W, 2 * MM, fill=1, stroke=0)
c.save()
print(PDF)

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
GREEN = colors.HexColor("#217565")
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


ios = qr(IOS_URL, "roomora-ios-qr.png")
android = qr(ANDROID_URL, "roomora-android-qr.png")
c = canvas.Canvas(str(PDF), pagesize=(W, H), pageCompression=1)
c.setTitle("Roomora | Ortak harcamalar, net hesaplar")
c.setAuthor("Roomora")
c.setFillColor(WHITE)
c.rect(0, 0, W, H, fill=1, stroke=0)
c.setFillColor(NAVY)
c.rect(0, H - 43 * MM, W, 43 * MM, fill=1, stroke=0)
c.drawImage(ImageReader(str(ROOT / "src" / "assets" / "mark-white.png")), 13 * MM, H - 32 * MM, 21 * MM, 21 * MM, mask="auto", preserveAspectRatio=True)
label(c, 37, 22, "ROOMORA", 23, WHITE, "SegoeBold")
label(c, 37, 31, "Birlikte harca. Net hesaplaş.", 9, colors.HexColor("#DBE9F1"))

label(c, 13, 55, "Evde de, yolda da", 19, NAVY, "SegoeBold")
label(c, 13, 63, "hesaplar karışmasın.", 19, NAVY, "SegoeBold")
label(c, 13, 75, "Kimin ödediği, kimin paylaştığı ve kalan bakiye", 9.3, MUTED)
label(c, 13, 81, "tek yerde, herkes için açık.", 9.3, MUTED)

c.setFillColor(PALE)
c.roundRect(13 * MM, H - 122 * MM, 122 * MM, 31 * MM, 3 * MM, fill=1, stroke=0)
c.setStrokeColor(colors.HexColor("#B9D1E0"))
c.line(74 * MM, H - 96 * MM, 74 * MM, H - 117 * MM)
label(c, 19, 100, "EV ARKADAŞLARI", 9.1, BLUE, "SegoeBold")
label(c, 19, 108, "Kira · fatura · market", 10, NAVY, "SegoeBold")
label(c, 19, 115, "Payları ve ödemeleri izle.", 8.3, MUTED)
label(c, 80, 100, "GEZİ EKİBİ", 9.1, GREEN, "SegoeBold")
label(c, 80, 108, "Otel · yemek · ulaşım", 10, NAVY, "SegoeBold")
label(c, 80, 115, "Yalnız ilgili kişilere böl.", 8.3, MUTED)

label(c, 13, 136, "Ücretsiz indir, grubunu oluştur.", 12, NAVY, "SegoeBold")
label(c, 13, 143, "Telefonunun mağazasına gitmek için kodu okut.", 8.6, MUTED)
for x, image, title in ((22, ios, "App Store"), (86, android, "Google Play")):
    c.setFillColor(WHITE)
    c.setStrokeColor(colors.HexColor("#CCDDE7"))
    c.roundRect((x - 5) * MM, H - 200 * MM, 50 * MM, 50 * MM, 2 * MM, fill=1, stroke=1)
    c.drawImage(image, x * MM, H - 192 * MM, 40 * MM, 40 * MM, mask="auto")
    c.setFillColor(NAVY)
    c.setFont("SegoeBold", 9)
    c.drawCentredString((x + 20) * MM, H - 198 * MM, title)
c.setFillColor(BLUE)
c.rect(0, 0, W, 4 * MM, fill=1, stroke=0)
c.linkURL(IOS_URL, (17 * MM, H - 200 * MM, 68 * MM, H - 149 * MM), relative=0)
c.linkURL(ANDROID_URL, (81 * MM, H - 200 * MM, 132 * MM, H - 149 * MM), relative=0)
c.save()
print(PDF)

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
PAPER = colors.HexColor("#F8FAFB")
MUTED = colors.HexColor("#526675")
GREEN = colors.HexColor("#8BD9C5")
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
    c.setFillColor(colors.HexColor("#DCE6EC"))
    c.roundRect((x + 1.6) * MM, (H / MM - top - height - 2.6) * MM,
                (width + 2.4) * MM, (height + 2.4) * MM, 2.4 * MM, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.roundRect((x - 0.7) * MM, (H / MM - top - height - 0.7) * MM,
                (width + 1.4) * MM, (height + 1.4) * MM, 2.1 * MM, fill=1, stroke=0)
    c.drawImage(ImageReader(str(image_path)), x * MM,
                (H / MM - top - height) * MM, width * MM, height * MM,
                mask="auto")


ios = qr(IOS_URL, "roomora-ios-qr.png")
android = qr(ANDROID_URL, "roomora-android-qr.png")
c = canvas.Canvas(str(PDF), pagesize=(W, H), pageCompression=1)
c.setTitle("Roomora | Evde de gezide de hesap ortada")
c.setAuthor("Roomora")
c.setFillColor(PAPER)
c.rect(0, 0, W, H, fill=1, stroke=0)
c.setFillColor(NAVY)
c.rect(0, H - 22 * MM, W, 22 * MM, fill=1, stroke=0)
c.drawImage(ImageReader(str(ROOT / "src" / "assets" / "mark-white.png")),
            12 * MM, H - 19 * MM, 16 * MM, 16 * MM,
            mask="auto", preserveAspectRatio=True)
label(c, 31, 13.5, "ROOMORA", 19, WHITE, "SegoeBold")
label(c, 112, 12.4, "EV  +  GEZİ", 7.5, GREEN, "SegoeBold")
c.setFillColor(BLUE)
c.rect(0, H - 23.3 * MM, W, 1.3 * MM, fill=1, stroke=0)

label(c, 13, 37, "AYNI MASADA, AYNI HESAPTA", 7.5, BLUE, "SegoeBold")
label(c, 13, 51, "Kim ne ödedi?", 20, NAVY, "SegoeBold")
label(c, 13, 62, "Hesap net.", 21, NAVY, "SegoeBold")
c.setFillColor(GREEN)
c.rect(13 * MM, H - 67 * MM, 38 * MM, 1.7 * MM, fill=1, stroke=0)
label(c, 13, 78, "Kira, market, otel ya da yemek.", 9, MUTED)
label(c, 13, 84, "Kimlerle paylaşılacağını seç.", 9, MUTED)
label(c, 13, 90, "Kimin kime borcu var, gör.", 9, MUTED)

phone(c, ROOT / "media" / "store-native" / "android" / "home-tr-01-home.png", 91, 29, 36)
phone(c, ROOT / "media" / "store-native" / "android" / "trip-tr-03-expenses.png", 115, 54, 25)
label(c, 93, 99, "EV", 6.8, BLUE, "SegoeBold")
label(c, 118, 103, "GEZİ", 6.8, BLUE, "SegoeBold")

c.setFillColor(NAVY)
c.rect(0, H - 148 * MM, W, 41 * MM, fill=1, stroke=0)
steps = [
    (13, "01", "EKLE", "Kim ödedi?", "Ne kadar tuttu?"),
    (57, "02", "PAYLAŞ", "Herkes mi, birkaç", "kişi mi? Sen seç."),
    (103, "03", "GÖR", "Kimin kime borcu", "var, anında gör."),
]
for x, number, title, first, second in steps:
    label(c, x, 117, number, 10.5, GREEN, "SegoeBold")
    label(c, x, 127, title, 10.5, WHITE, "SegoeBold")
    label(c, x, 135, first, 7.9, colors.HexColor("#D9E5EB"))
    label(c, x, 141, second, 7.9, colors.HexColor("#D9E5EB"))
c.setStrokeColor(colors.HexColor("#456071"))
c.line(52 * MM, H - 115 * MM, 52 * MM, H - 142 * MM)
c.line(98 * MM, H - 115 * MM, 98 * MM, H - 142 * MM)

label(c, 13, 158, "Birlikte indir, hesabı birlikte gör.", 11.3, NAVY, "SegoeBold")
label(c, 13, 164, "Telefonuna uygun kodu okut. Ücretsiz.", 8.1, MUTED)

for x, image, title, url, color in (
    (22, ios, "iPhone / App Store", IOS_URL, BLUE),
    (90, android, "Android / Google Play", ANDROID_URL, colors.HexColor("#267B68")),
):
    c.setFillColor(color)
    c.rect(x * MM, H - 169 * MM, 34 * MM, 1.2 * MM, fill=1, stroke=0)
    c.drawImage(image, x * MM, H - 203 * MM, 34 * MM, 34 * MM, mask="auto")
    c.setFillColor(NAVY)
    c.setFont("SegoeBold", 8)
    c.drawCentredString((x + 17) * MM, H - 207 * MM, title)
    c.linkURL(url, (x * MM, H - 208 * MM, (x + 34) * MM, H - 169 * MM), relative=0)

c.save()
print(PDF)

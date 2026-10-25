"""Generate the print-ready A5 Roomora handout with store-specific QR codes."""

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

font_dir = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Segoe", str(font_dir / "segoeui.ttf")))
pdfmetrics.registerFont(TTFont("SegoeBold", str(font_dir / "segoeuib.ttf")))

mm = 72 / 25.4
w, h = 148 * mm, 210 * mm
navy = colors.HexColor("#182C3C")
blue = colors.HexColor("#286593")
muted = colors.HexColor("#637581")
line = colors.HexColor("#CBD9E1")
white = colors.white


def qr(url, filename):
    code = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=4)
    code.add_data(url)
    code.make(fit=True)
    image = code.make_image(fill_color="#182C3C", back_color="white").convert("RGB")
    image.save(OUT / filename)
    return ImageReader(image)


ios = qr(IOS_URL, "roomora-ios-qr.png")
android = qr(ANDROID_URL, "roomora-android-qr.png")
c = canvas.Canvas(str(PDF), pagesize=(w, h), pageCompression=1)
c.setTitle("Roomora | Evde ve gezide ortak harcamalar")
c.setAuthor("Roomora")

c.setFillColor(navy)
c.rect(0, h - 42 * mm, w, 42 * mm, fill=1, stroke=0)
c.setFillColor(white)
c.setFont("SegoeBold", 30)
c.drawString(14 * mm, h - 22 * mm, "Roomora")
c.setFont("Segoe", 11)
c.drawString(14 * mm, h - 31 * mm, "Birlikte harca. Net hesaplaş.")

c.setFillColor(navy)
c.setFont("SegoeBold", 18)
c.drawString(14 * mm, h - 57 * mm, "Evde de gezide de")
c.drawString(14 * mm, h - 65 * mm, "hesaplar net olsun.")
c.setFont("Segoe", 9.8)
c.setFillColor(muted)
c.drawString(14 * mm, h - 75 * mm, "Kira, fatura, market; otel, yemek, ulaşım.")
c.drawString(14 * mm, h - 81 * mm, "Kim ödedi, kimlerle paylaşıldı, kim kime borçlu?")

steps = [
    ("01", "Grubunu kur", "Ev arkadaşlarını veya gezi ekibini ekle."),
    ("02", "Harcamayı kaydet", "Ödeyeni ve yalnız ilgili kişileri seç."),
    ("03", "Bakiyeyi gör", "Ödemeleri bildir, onayla, hesabı kapat."),
]
y = h - 95 * mm
for number, title, body in steps:
    c.setFillColor(blue)
    c.setFont("SegoeBold", 11)
    c.drawString(14 * mm, y, number)
    c.setFillColor(navy)
    c.setFont("SegoeBold", 10.5)
    c.drawString(27 * mm, y, title)
    c.setFillColor(muted)
    c.setFont("Segoe", 8.7)
    c.drawString(27 * mm, y - 5.4 * mm, body)
    y -= 17 * mm

c.setStrokeColor(line)
c.line(14 * mm, h - 151 * mm, 134 * mm, h - 151 * mm)
c.setFillColor(navy)
c.setFont("SegoeBold", 10)
c.drawString(14 * mm, h - 160 * mm, "Hemen başla")

qr_size = 27 * mm
c.drawImage(ios, 26 * mm, h - 193 * mm, qr_size, qr_size, mask="auto")
c.drawImage(android, 94 * mm, h - 193 * mm, qr_size, qr_size, mask="auto")
c.setFillColor(navy)
c.setFont("SegoeBold", 8)
c.drawCentredString(39.5 * mm, h - 198 * mm, "iPhone")
c.drawCentredString(107.5 * mm, h - 198 * mm, "Android")
c.setFillColor(muted)
c.setFont("Segoe", 7)
c.drawCentredString(w / 2, 5 * mm, "Roomora  |  Ortak harcamalar, tek bir net hesap")
c.save()
print(PDF)

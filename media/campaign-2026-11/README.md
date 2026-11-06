# Roomora kampanya seti

Görseller 6 Kasım 2026 arayüz denetiminden alınan örnek ekranlar ve sahte kişi adlarıyla hazırlandı. **Gezi harcamaları paneli örnek senaryodur; gerçek kullanıcı kaydı değildir.** Hiçbir sosyal medya hesabında paylaşılmadı.

| Dosya | Kullanım | Ölçü |
|---|---|---|
| `roomora-instagram-ev.png` | Instagram dikey gönderi, ev ve ortak gider | 1080 × 1350 |
| `roomora-instagram-gezi.png` | Instagram dikey gönderi, arkadaşlarla gezi | 1080 × 1350 |
| `roomora-linkedin.png` | LinkedIn yatay gönderi | 1200 × 627 |
| `roomora-a5-on.pdf` | A5 tek yüz baskı broşürü, iPhone ve Android QR | 148 × 210 mm |
| `roomora-a5-on.png` | Broşür önizlemesi | 1748 × 2480 |

## Instagram: ev

Kira, market, fatura... Ortak harcamalarda "kim ne ödedi" konuşması uzamasın. Roomora'da harcamayı ekle, kimlerle paylaşılacağını seç, bakiyeyi birlikte gör. iPhone ve Android'de.

#Roomora #EvArkadaşı #OrtakHarcamalar

## Instagram: gezi

Üç arkadaş yola çıktınız. Oteli biri, akşam yemeğini diğeri, ulaşımı bir başkası ödedi. Roomora'da gezi grubunu ayrı tutabilir, her masrafı yalnız ilgili arkadaşlarla paylaşabilirsiniz. Görseldeki tutarlar örnektir.

#Roomora #Gezi #ArkadaşlarlaSeyahat

## LinkedIn

Roomora'yı, birlikte yaşarken ve arkadaşlarla yolculuk ederken aynı soruyu tekrar tekrar sormamak için geliştiriyorum: "Kimin kime ne kadar borcu var?"

Harcamayı kaydedip ödeyeni ve katılımcıları seçiyorsunuz. Eşit paylaşımın yetmediği durumlarda payları kişiye göre ayarlayabiliyorsunuz. Fişten kalem çıkarma, fatura ve ödeme takibi de aynı akışın parçası.

Bu bir Takosware projesi. Geri bildirimlerle geliştirmeye devam ediyorum.

## Bağlantılar ve üretim

- iPhone: https://apps.apple.com/app/id6800784560
- Android: https://play.google.com/store/apps/details?id=com.taopato.roomora
- Kaynak şablon: `design.html`; yeniden üretim: `node scripts/render-roomora-campaign.mjs` (repo kökünden).
- Broşür PDF'si tek sayfa A5 olarak ve render görüntüsüyle kontrol edildi. Baskıda kenardan kesme payı isteniyorsa matbaaya göre ayrıca bleed eklenmeli.

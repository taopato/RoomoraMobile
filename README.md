# Roomora Mobile

Mobil build, TestFlight, Google Play Internal Testing, OTA ve sürüm yükseltme
akışı için [Mobil Sürüm Akışı](docs/MOBILE_RELEASE_FLOW.md) belgesine bakın.

Roomora, ev ve gezi gruplarının ortak harcamalarını kişi bazında paylaşan Expo tabanlı mobil uygulamadır. Aynı hesaplama akışı kira ve faturalar için de otel, yemek ve ulaşım için de çalışır.

## Uygulama

| Ana Sayfa | Giderler | Faturalar |
| --- | --- | --- |
| ![Ana Sayfa](media/store/home-tr-01-home.png) | ![Giderler](media/store/home-tr-02-expenses.png) | ![Faturalar](media/store/home-tr-05-bills.png) |

Ekranlardaki ad ve tutarlar kurgusal demo verisidir; gercek kullanici hesabindan alinmamistir.

## Öne Çıkanlar

- Hızlı ortak harcama ve kişisel kalem girişi
- Üye bazlı borç, alacak ve kısmi ödeme takibi
- Fatura, kira, düzenli gider ve kalan taksit planları
- Paylaşımlı alışveriş ve ev notları
- Fiş tarama ve manuel düzeltme akışı
- Kalıcı favori ev, profil ve ev fotoğrafı
- Otel, yemek ve ulasim icin gezi grubu ve secili uyelerle paylasim
- Açık/koyu tema ve Türkçe/İngilizce dil altyapısı

## Yerel Çalıştırma

```bash
npm install
npm start
```

Telefon ve bilgisayar aynı ağdayken Expo Go ile terminaldeki QR kodu okutun. API varsayılan olarak yerel ağdaki `5118` portunu kullanır; adresi `.env` veya `app.json` üzerinden yapılandırın.

```bash
npm test
npm run web:build
npm run export:android
npm run export:ios
```

## Yapı

- `App.js`: Navigation ve provider yapısı
- `src/screens`: Ürün ekranları
- `src/services/api.js`: Backend istemcisi
- `src/context/AuthContext.js`: Oturum ve favori ev
- `src/shared/theme`: Roomora tasarım sistemi
- `docs/store`: App Store ve Google Play hazırlıkları
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): ekran, API ve hesap akisinin haritasi
- `scripts/capture-demo-store.mjs`: yalniz yerel ornek veriyle magaza goruntusu uretimi

## Bağlı Projeler

- Roomora Backend: ASP.NET Core API
- Roomora Web: Web istemcisi
- Roomora OCR: Fiş okuma servisi

Üretim paketinden önce [yayın kontrol listesini](docs/store/RELEASE_CHECKLIST.md) tamamlayın.

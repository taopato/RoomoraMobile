# Roomora calisma notlari

Son guncelleme: 2026-10-22. Bu dosya sohbet uzadiginda kaldigimiz yeri hatirlamak icindir; uygulama degisikligi veya yayin onayi yerine gecmez.

## Mevcut durum

- Google Play'de uretim erisimi verilmis. Kullanici Turkiye bolgesini ve kapali test surumu 5 (1.0.1) icin tam kullanima sunma istegini incelemeye gonderdi. Son paylasilan ekranda degisiklikler **incelemede**; canliya ciktigini varsayma, Console durumunu yeniden dogrula.
- 2026-10-22'de paylasilan son ekran `Acik test` kanalina ait ve bu kanalda surum yok. Bu, uretim basvurusunu etkilemez. Mevcut test edilmis surum 5 uretime terfi ettirildigi icin kod degismediyse yeni Android build/AAB gerekmez. `Test edin ve yayinlayin > Uretim` veya `Yayin ozeti` uzerinden inceleme durumu izlenmeli. Yonetilen yayinlama aciksa onaydan sonra `Yayinla` adimi gerekebilir.
- Ayni gun paylasilan `Uretim` ekraninda kanal `Etkin degil`, `Taslak surum`, `1 ulke/bolge` ve `1 yukleme` gorunuyor; Turkiye hedeflemesi dogru. Bu ekran tek basina incelemenin bitip bitmedigini gostermiyor. `Uretim > Surumler` altindaki taslak durumu ve `Yayin ozeti` kontrol edilmeli. Yeni build olusturma; mevcut surum 5 taslagi tamamlanacak veya inceleme sonucu beklenecek.
- `Uretim > Surumler` ekraninda `Basliksiz surum`, durum `Taslak` ve `Surumu duzenle` goruldu. Bu uretim surumu henuz incelemeye gonderilmemis/tamamlanmamis. Siradaki adim `Surumu duzenle`; mevcut yuklenmis surum 5/AAB korunacak, yeni build yuklenmeyecek. Surum adi ve notlari doldurulup `Sonraki`/`Kaydet` ile onizleme ekranina gecilecek.
- `Uretim surumu olusturma` ekraninda paket alani bos ve `Kitapliktan ekle` secenegi goruldu. Mevcut kapali test AAB'si buradan secilerek uretim taslagina baglanmali; `Yukle` ile yeni paket yuklenmemeli. Ardindan surum adi `Roomora 1.0.1` ve yerellestirilmis surum notlari girilecek.
- Surum 5 (1.0.1) kitapliktan uretim taslagina eklendi, kaydedildi ve incelemeye gonderildi. 2026-10-22'de Play Console dogrudan salt okunur kontrol edildi: uretim kanalinda `5 (1.0.1) surumu incelemede`, kanal `Etkin`, 1 ulke/bolge ve 1 yukleme gorunuyor. Su anda islem gerekmiyor. Onceki yorum duzeltmesi: ekrandaki tam etiket `Yonetilen yayinlama devre disi birakildi`; yani onaydan sonra surum otomatik yayinlanacak. Acik test ayri bir kanal ve orada surum olmadigi icin `Yeni surum olustur` dugmesinin acik olmasi normal.
- Kullanici yeni ozellikleri iOS TestFlight'ta canli veritabaniyla denemek istiyor. Android uretim kanalina bu degisikliklerle dokunma; iOS ve Android magazalarinda canli yayin ancak kullanici acikca "canliya al" dediginde yapilacak.
- 2026-10-22 uygulama calismasi basladi. Backend degisiklikleri canli API'ye dagitilacak, mobil degisiklikler yeni native bildirim modulu nedeniyle OTA yerine yeni TestFlight binary'si olarak gonderilecek.

## Istekler ve kod bulgulari

1. **Marka adi:** `app.json` icindeki uygulama adi zaten `Roomora`. Fakat `src/screens/roomora/RoomoraHome.js`, `src/screens/SettingsInfo.js` ve `src/screens/GirisYap.js` gibi ekranlarda `Ortak yasamin kolay hali` slogani gorunuyor. Kullanici yalniz `Roomora` istiyor. Degisiklikten once tam olarak hangi gorunumu kastettigini uygulama ve magazadaki gorunen adlar arasinda ayir; ilgili sabitleri/i18n karsiliklarini birlikte duzelt. Magaza listeleme adi ayrica kontrol edilmeli.
2. **Gezi grubu:** `Domain/Entities/House.cs` sadece ad, uyeler, olusturan ve kapak resmi tutuyor. `src/screens/YeniEvGrubu.js` sadece ev adi aliyor. Oneri: mevcut House kimligini/tablosunu koruyup geriye donuk uyumlu `GroupType = Home | Trip` ekle; mevcut gruplari Home varsay. Gezi icin istege bagli baslangic/bitis tarihi, para birimi ve arsiv durumu; ortak harcama/paylasim/bakiye/odeme motoru ortak kalsin. Gezi ekraninda ev faturasi ve ev notlari gibi ev odakli alanlari gizle/uyarla. Adlandirma/i18n, davet ve aktif grup secimi beraber incelenmeli. Gezi icin coklu para birimi gerekiyorsa ayri faz olarak tasarla; sessizce TRY disi tutarlari birlestirme.
3. **Kisisel hizli harcama:** `src/screens/HarcamaEkle.js` sabit `roomora_quick_expense_choices` AsyncStorage anahtari kullaniyor; hesaplar arasi ayrim yok. Yeni secim yalniz ad/kategori kaydediyor. Son kullanimi veya ayni adli son harcamayi arayip tutar, odeyen, katilimci bilgisi doldurmaya calisiyor; ayni adli farkli sigaralar icin belirsiz. Oneri: sunucuda `QuickExpenseTemplate` (OwnerUserId, GroupId, Name, Amount, Category, Description, PayerUserId, ParticipantIds/split, IsArchived, timestamps) ve yalniz sahibine erisim. Grup uyeleri degisince eski ID'leri dogrula. Sablon secimi formu **on doldurur**, harcamayi otomatik kaydetmez. Sablon olustururken o anki tum ilgili alanlari acikca kaydet; "son kayit" aramasini kaldir. Eski cihaz-yerel secimleri hesap karismasi yaratmadan ihtiyatli tasima/temizleme plani gerekir.
4. **Degisken su faturasi:** `Domain/Entities/RecurringCharge.cs` zaten `AmountMode.Variable` ve nullable `DueDay` iceriyor, ancak `RecurringChargesController.cs` plan olustururken zorunlu DueDay istiyor; `src/screens/FaturaEkle.js` de dueDate zorunlu. `CreateExpenseCommandHandler.cs` dueDate yoksa islem tarihini atiyor. Oneri: "degisken fatura / odendiginde tutar gir" modu; fatura plani icin vade zorunlu degil, ay gelince odenen gercek tutar/tarih/odeyen kaydedilir, tekil islem ve kisi paylari uretilir. Kurumun odendi durumu ile ev arkadaslarinin birbirine borcu ayri durumlar olarak gosterilir. Eski duzenli/tekil faturalar ve ledger icin geriye uyum/test gerekir.
5. **Telefon push'u:** `src/screens/Bildirimler.js` yalniz bekleyen odemeleri API'den okuyor; `src/screens/SettingsInfo.js` bildirim tercihlerini sadece cihaz AsyncStorage'inda tutuyor. Kodda `expo-notifications` veya backend push altyapisi bulunmadi. Oneri: izin isteme + cihaz tokenini hesaba kaydetme/silme; backend olay bazli bildirim kaydi/outbox, sunucu tarafli tercihler, push gonderim isleyicisi, teslim/hatali token yonetimi, tekrar gonderimde idempotency, dokununca ilgili ekrana yonlendirme. Ilk olaylar: odeme talebi/onayi, ev/gezi daveti, yaklasan gercek vade; degisken ve odenmis su faturasi icin sahte vade bildirimi yok. Push gelsin gelmesin uygulama ici kayit kalici olmali. Expo kurulumu iOS push key, Android FCM v1 ve yeni native build gerektirir; Expo Go ile dogrulama planlama.

## Onerilen sira ve kabul olcutleri

1. Grup turu ve fatura semantigini veri/API sozlesmesiyle netlestir; mevcut evlerin davranisi degismemeli.
2. Kisisel hizli harcama sablonunu ve secerken tum alanlarin on dolmasini uygula; farkli kullanici/ev hesaplari arasinda veri sizmamali.
3. Degisken faturada gercek tutar kaydedilmeden borc dogmamali; odendi etiketi banka/kurum odemesini, kisi bakiyesi de ayri borcu dogru gostermeli.
4. Push bildirimleri test buildlerinde uctan uca sinayip sonra yayina hazirla. Tum degisiklikleri once test kanallarinda onaya sun; uretime otomatik gonderme.

## 2026-10-22 uygulananlar

- Backend'e geriye uyumlu `GroupType` (Home/Trip), gezi tarihleri, para birimi ve arsiv alanlari eklendi. Mevcut gruplar otomatik Home kalir.
- Yeni grup ekranina Ortak Ev / Gezi secimi eklendi. Gezi grubunda planli faturalar yuklenmez ve Faturalar sekmesi gizlenir; harcama, bakiye, odeme ve notlar ayni motoru kullanir.
- Kullanici ve grup bazli `QuickExpenseTemplate` eklendi. Tutar, kategori, aciklama, odeyen, katilimcilar ve kisisel paylar sunucuda saklanir; secmek yalniz formu doldurur ve otomatik harcama olusturmaz. Silme soft delete'tir.
- Su faturasi tekil odenmis gider olarak kaydedilir. Su seciliyken ayrica son odeme tarihi istenmez; fatura tarihi odeme tarihi olarak kullanilir. Kisi paylari ayri borc olarak takip edilmeye devam eder.
- `expo-notifications` ile iOS/Android cihaz kaydi, kullanici tercihleri, cikista token pasiflestirme ve sabit planlar icin yerel hatirlatma eklendi. Backend odeme bildirimi/onay/red ve kayitli kullanici davetlerinde Expo push gonderir. Cihaz dili saklanir ve push metni Turkce/Ingilizce secilir.
- Gorunen "Ortak yasamin kolay hali" sloganlari kaldirildi; marka yuzeylerinde yalniz Roomora kaldi.
- Expo SDK yama paketleri uyumlu surumlere getirildi. `expo-doctor` 20/20, domain testleri, iOS JS export ve dil gecis testi basarili.
- Backend commit `6b02fd7` 2026-10-22'de `main` dalina gonderildi. GitHub `Backend CI`, `Publish Backend Image` ve production deployment basarili. Dagitim yedek ve EF migration adimlarini calistirdi. Canli `/health` 200/dataset available; yeni QuickExpenseTemplates endpointi yetkisiz istege 401 vererek canli rotanin yuklendigini dogruladi.

## Siradaki adim

1. `testing` EAS profiliyle production API'ye bagli yeni iOS binary build edip TestFlight'a otomatik gonder.
2. EAS build ve App Store Connect teslim durumunu izle; Android build veya production yayini yapma.
3. Kullanici TestFlight'ta ozellikle gezi grubu, hizli harcama, su faturasi ve push iznini test edecek.

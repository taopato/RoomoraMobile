# Mobil akış

```mermaid
flowchart LR
    UI[Expo / React Native ekranlari] --> Auth[AuthContext ve guvenli oturum]
    UI --> API[services/api.js]
    UI --> State[hooks ve domain yardimcilari]
    State --> API
    API --> Backend[Roomora Backend API]
    Backend --> OCR[Roomora OCR]
    Backend --> DB[(SQL Server)]
```

`App.js` provider'lari ve navigation'i kurar. `src/screens/roomora` ana akislari tasir; `src/screens` altindaki form ve ayrinti ekranlari bu akislardan acilir. `src/services/api.js` HTTP sozlesmesini, `src/shared` ortak tema, i18n ve oturum yardimcilarini tutar. Borc hesaplamasi telefonda yeniden icat edilmez; sunucudan gelen ledger bakiyesi gosterilir.

```mermaid
sequenceDiagram
    actor User as Kullanici
    participant App as Mobil uygulama
    participant API as Backend API
    participant DB as SQL Server
    User->>App: Tutar, odeyen ve katilimcilari secer
    App->>API: Harcama olustur
    API->>DB: Harcama ve kisi paylarini kaydet
    API-->>App: Kaydedilen harcama
    App->>API: Giderler ve borc ozeti
    API-->>App: Islemler ve net bakiyeler
    User->>App: Odeme bildirir
    App->>API: Odeme bildirimi
    API-->>App: Karsi tarafin onayi beklenir
```

## Demo materyal

Magaza goruntuleri `scripts/capture-demo-store.mjs` ile yerel web export'undan ve yakalanan sahte API yanitlarindan uretilir. Script canli API'ye veya gercek kullanici hesabina baglanmaz. Bu dosyalar urun anlatimi icindir; iOS magazasina yerlestirilmeden once Apple'in cihaz yakalama gereklilikleri ayrica dogrulanmalidir.

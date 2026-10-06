# NameShield

Gönderi veya yanıt yazarken gerçek isminizi otomatik olarak İngilizce bir takma ada çeviren Chrome + Safari eklentisi.

```
Merhaba, ben Mehmet Altındal  →  Merhaba, ben Matthew Allington
```

## Nasıl çalışır

- **Canlı değiştirme:** Yazmayı bıraktığınızda (~0,5 sn) metindeki korunan isimler takma adla değiştirilir.
- **Gönderim koruması:** Post / Reply / Gönder / Yanıtla düğmesine basıldığında veya Enter / Cmd+Enter ile gönderilirken isim hâlâ metindeyse gönderim **durdurulur**, isim değiştirilir ve bir bildirim gösterilir. Kontrol edip tekrar gönderirsiniz.
- **Esnek eşleşme:** `Mehmet Altındal`, `MEHMET ALTINDAL`, `mehmet altindal`, `Altındal'ın` hepsi yakalanır; yazım biçimi korunur (`MEHMET` → `MATTHEW`). `@kullanıcıadı` ve `#etiket` içindeki isimlere dokunulmaz.
- **Ad / soyad ayrı:** İsteğe bağlı olarak “Mehmet” tek başına da “Matthew” olur.
- **Takma ad üretimi:** Yaygın Türkçe isimler için anlamca/sesçe yakın bir İngilizce karşılık (Mehmet → Matthew, Ayşe → Ashley…), soyadı için aynı harfle başlayan ve sesçe en yakın İngilizce soyadı seçilir. 🔀 ile alternatif önerilir, isterseniz kendiniz de yazabilirsiniz.
- Veriler yalnızca tarayıcınızda (`storage.local`) tutulur; hiçbir sunucuya gönderilmez.

X/Twitter, Facebook, LinkedIn, Instagram, Reddit, YouTube yorumları gibi `textarea` ve `contenteditable` tabanlı editörlerde çalışır.

### Hazır liste: Türk siyasetçileri

Cumhurbaşkanı, mevcut kabine, yakın dönem eski bakanlar ve öne çıkan siyasetçiler (89 kişi) hazır bir liste olarak gelir; ayarlardan kapatılabilir. Tam isimler her zaman değişir; soyadı yalnızca ayırt ediciyse (Erdoğan, Bahçeli, İmamoğlu…) tek başına değiştirilir. “Bak”, “Kurum”, “Özel”, “Fidan” gibi günlük dilde de geçen kelimelere dokunulmaz. Liste Ekim 2026 itibarıyla [tccb.gov.tr/kabine](https://www.tccb.gov.tr/kabine/) kaynağına göre hazırlanmıştır; değişiklikler için PR açabilirsiniz (`extension/src/names.js` → `PRESETS`).

## Kurulum (Chrome, Edge, Brave, Arc)

1. Bu sayfada **Code → Download ZIP** ile indirip zip'i açın (veya `git clone`).
2. `chrome://extensions` adresini açın (Edge: `edge://extensions`).
3. Sağ üstten **Geliştirici modu**nu açın.
4. **Paketlenmemiş öğe yükle** → `extension/` klasörünü seçin.
5. Eklenti simgesine tıklayıp isminizi ekleyin.

Güncellemek için yeni sürümü indirip aynı klasörün üzerine yazın ve `chrome://extensions` sayfasında ↻ düğmesine basın.

## Safari'ye yükleme

Xcode projesi `safari/NameShield/` içinde hazır (kaynak olarak `extension/` klasörünü kullanır, kopyalamaz).

1. `safari/NameShield/NameShield.xcodeproj` dosyasını Xcode'da açın.
2. Signing & Capabilities'te her iki hedef (NameShield ve NameShield Extension) için kendi Team'inizi seçin.
3. ▶︎ Run ile uygulamayı çalıştırın.
4. Safari → Ayarlar → Gelişmiş → **“Web geliştiricileri için özellikleri göster”** açın; ardından Geliştir menüsünden **“İmzasız eklentilere izin ver”** seçin (imzasız derlemeler için).
5. Safari → Ayarlar → Uzantılar → **NameShield**'ı etkinleştirin ve “Tüm web siteleri”nde izin verin.

`extension/` klasöründe değişiklik yaptıktan sonra Safari için Xcode'da tekrar Run yeterlidir. Projeyi sıfırdan üretmek isterseniz:

```bash
xcrun safari-web-extension-converter extension --project-location safari --app-name NameShield --bundle-identifier com.mehmetaltindal.nameshield --macos-only --swift --no-open --force
```

> Not: Dönüştürücü uygulamanın bundle ID'sini `com.mehmetaltindal.NameShield` olarak yazar; uzantınınkiyle aynı (küçük harf) olacak şekilde `project.pbxproj` içinde düzeltin, yoksa derleme “Embedded binary's bundle identifier is not prefixed…” hatası verir.

## Önemli not

NameShield metindeki isimleri değiştirir; sizi **anonim yapmaz** ve hukuki koruma sağlamaz. Hesabınız aynı hesaptır ve bağlamdan kimin kastedildiği anlaşılabilir. Göndermeden önce metni kontrol edin.

## Katkı

Hata bildirimi, yeni isim eşleştirmeleri ve site uyumluluğu düzeltmeleri için issue / pull request açabilirsiniz.

## Dosya yapısı

```
extension/
  manifest.json        Manifest V3 (Chrome + Safari ortak)
  src/names.js         İsim sözlükleri, takma ad üretici, Türkçe karakter duyarlı eşleştirici
  src/content.js       Yazı alanlarını izler, değiştirir, gönderimi korur
  popup/               Hızlı aç/kapat, site bazında kapatma, hızlı isim ekleme
  options/             Tüm isimler, ayarlar ve deneme alanı
  icons/
safari/NameShield/     Xcode projesi (macOS Safari)
```

## Lisans

[MIT](LICENSE)

# 🚀 Otobüs Yolculuğu Progress Bot - Deployment Rehberi

## 🔧 Kurulum ve Çalıştırma

### 1. Proje Kurulumu
```bash
git clone <repo-url>
cd sayoms
bun install
```

### 2. .env Dosyası Oluşturma
Proje kök dizininde `.env` dosyası oluşturun:

```env
# Yolculuk Zamanları (ISO format)
START_TIME=2025-06-20T08:00:00
END_TIME=2025-06-20T14:00:00

# WhatsApp Numaraları (Virgülle ayrılmış - birden fazla numara için)
PHONE_NUMBERS=+905551234567,+905559876543,+905555555555

# Alternatif: Tek numara için (geriye uyumluluk)
# PHONE_NUMBER=+905551234567

# WhatsApp Session Path
SESSION_PATH=./session
```

### 3. Test Çalıştırması
```bash
# Geliştirme modu
bun run dev

# Production modu
bun start
```

## 📱 WhatsApp Kurulumu

### İlk Kurulum (Sadece bir kez)
1. Bot ilk çalıştırıldığında **terminalde QR kod görseli** otomatik gösterilir
2. Aynı zamanda `qr-code.png` dosyası oluşturulur
3. QR kodu WhatsApp uygulaması ile terminalde veya PNG dosyasından okutun  
4. **Session otomatik kaydedilir** (`./session` klasöründe)
5. QR kod dosyaları otomatik temizlenir

### Sonraki Çalıştırmalar
- ✅ **QR kod GEREKMİYOR** - Kayıtlı session kullanılır
- ✅ Direkt bağlanır ve çalışmaya başlar
- ⚠️ Session bozulursa: `rm -rf ./session` komutu ile temizleyin

### QR Kod Özellikleri (Sadece ilk seferde)
- 🖥️ **Terminal ASCII QR** - Direkt konsolda görsel
- 📄 **PNG Dosyası** - qr-code.png (300x300px)
- 📝 **Text Backup** - qr-code.txt (manuel kullanım için)
- 🧹 **Otomatik temizlik** - Session kaydedildikten sonra QR dosyaları silinir

## 🔄 PM2 ile Production Kurulumu

### PM2 Kurulumu
```bash
# Global PM2 kurulumu
bun add -g pm2

# Veya npm ile
npm install -g pm2
```

### PM2 Ecosystem Dosyası
Proje kök dizininde `ecosystem.config.js` oluşturun:

```javascript
module.exports = {
  apps: [{
    name: 'travel-progress-bot',
    script: 'bun',
    args: 'start',
    cwd: '/path/to/your/project',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### PM2 Komutları
```bash
# Log klasörü oluştur
mkdir logs

# Bot'u başlat
pm2 start ecosystem.config.js

# Durumu kontrol et
pm2 status

# Logları izle
pm2 logs travel-progress-bot

# Yeniden başlat
pm2 restart travel-progress-bot

# Durdur
pm2 stop travel-progress-bot

# Sil
pm2 delete travel-progress-bot

# Sistem başlangıcında otomatik başlat
pm2 startup
pm2 save
```

## 📊 Bot Özellikleri

### Zaman Hesaplama
- ✅ Yolculuk öncesi: %0 ilerleme
- ✅ Yolculuk sırasında: Gerçek zamanlı yüzde hesaplama
- ✅ Yolculuk sonrası: %100 ilerleme

### Progress Bar Görseli
- 📏 Boyut: 500x150px
- 🎨 Modern koyu tema
- 📊 Gradient progress bar
- 📱 WhatsApp uyumlu PNG format

### Cron Schedule
- ⏰ Her 5 dakikada otomatik güncelleme
- 🔄 Hata durumunda retry mekanizması
- 📱 WhatsApp bağlantı kontrolü

## 🚨 Sorun Giderme

### Yaygın Hatalar

1. **Canvas Kurulum Hatası**
   ```bash
   # macOS
   brew install pkg-config cairo pango libpng jpeg giflib librsvg
   
   # Ubuntu/Debian
   sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
   ```

2. **WhatsApp Bağlantı Sorunu / Her seferinde QR kod istiyor**
   ```bash
   # Session dosyalarını tamamen temizle
   rm -rf ./session
   
   # QR kod dosyalarını da temizle
   rm -f qr-code.png qr-code.txt
   
   # Bot'u yeniden başlat
   bun start
   ```

3. **.env Dosyası Bulunamıyor**
   - Dosya adının tam olarak `.env` olduğunu kontrol edin
   - Proje kök dizininde olduğunu kontrol edin

### Loglar
```bash
# PM2 logları
pm2 logs travel-progress-bot --lines 50

# Gerçek zamanlı log takibi
pm2 logs travel-progress-bot --follow
```

## 🔒 Güvenlik

- ✅ .env dosyası .gitignore'da
- ✅ Session dosyaları güvenli
- ✅ Hata logları detaylı
- ✅ Graceful shutdown desteği

## 📞 Destek

Bot ile ilgili sorunlar için:
1. Logları kontrol edin
2. .env dosyası ayarlarını doğrulayın
3. WhatsApp bağlantısını test edin 
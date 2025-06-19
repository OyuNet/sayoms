import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as fs from 'fs';
import * as path from 'path';
import * as qrTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';

export class WhatsAppBot {
  private client: Client;
  private isReady: boolean = false;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;

  constructor() {
    // Ready promise'i oluştur
    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });

    const sessionPath = process.env.SESSION_PATH || './session';
    
    // Session klasörünü kontrol et ve oluştur
    this.ensureSessionDirectory(sessionPath);
    
    // LocalAuth kullanarak session'ı kaydet
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: sessionPath,
        clientId: 'travel-progress-bot'
      }),
      puppeteer: {
        headless: true,
        timeout: 60000, // 60 saniye timeout
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding'
        ]
      }
    });

    this.setupEventHandlers();
  }

  private ensureSessionDirectory(sessionPath: string): void {
    try {
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
        console.log(`📁 Session klasörü oluşturuldu: ${sessionPath}`);
      } else {
        console.log(`📁 Session klasörü mevcut: ${sessionPath}`);
        // Session dosyalarının varlığını kontrol et
        const sessionFiles = fs.readdirSync(sessionPath);
        if (sessionFiles.length > 0) {
          console.log(`✅ Kayıtlı session bulundu (${sessionFiles.length} dosya). QR kod gerekmeyebilir.`);
        }
      }
    } catch (error) {
      console.error('❌ Session klasörü oluşturulamadı:', error);
    }
  }

  private setupEventHandlers(): void {
    // QR kodu konsola yazdır (sadece session yoksa)
    this.client.on('qr', async (qr) => {
      console.log('\n🔳 Yeni QR Kodu oluşturuldu! WhatsApp uygulaması ile aşağıdaki QR kodunu okutun:\n');
      console.log('⚠️  Bu QR kodu bir kez okutulduktan sonra session kaydedilecek ve bir daha gerekmeyecek.\n');
      
      // QR kodunu terminalde görsel olarak göster
      qrTerminal.generate(qr, { small: true }, (qrString) => {
        console.log(qrString);
      });
      
      // QR kodunu PNG dosyası olarak kaydet
      await this.saveQRCodeAsPNG(qr);
      
      // QR kodunu metin olarak da kaydet (backup)
      this.saveQRCodeAsText(qr);
      
      console.log('\n📱 QR kodu taratın veya qr-code.png dosyasını açarak telefonunuzla okutun');
      console.log('💾 Okutulduktan sonra session kaydedilecek ve bir daha QR kod gerekmeyecek\n');
    });

    // Session yükleniyor
    this.client.on('loading_screen', (percent, message) => {
      console.log(`⏳ Session yükleniyor: ${percent}% - ${message}`);
    });

    // Session kimlik doğrulaması
    this.client.on('authenticated', () => {
      console.log('✅ Session kimlik doğrulaması başarılı! QR kod gerekmedi.');
    });

    // Change state events - debug için
    this.client.on('change_state', (state) => {
      console.log('🔄 WhatsApp state değişti:', state);
    });

    // Debug için tüm eventleri logla
    this.client.on('message', () => {
      // Silent - sadece bağlantının çalıştığını görmek için
    });

    // Client hazır olduğunda
    this.client.on('ready', () => {
      console.log('🎉 WhatsApp Client hazır! Bot çalışmaya başlıyor...');
      this.isReady = true;
      
      // Session başarıyla yüklendiğinde QR kod dosyalarını temizle
      this.cleanupQRFiles();
      
      // Ready promise'i resolve et
      this.readyResolve();
    });

    // Bağlantı kesildiğinde
    this.client.on('disconnected', (reason) => {
      console.log('❌ WhatsApp Client bağlantısı kesildi:', reason);
      this.isReady = false;
    });

    // Hata durumları
    this.client.on('auth_failure', (msg) => {
      console.error('❌ Kimlik doğrulama hatası:', msg);
      console.error('🔧 Session dosyalarını silin ve yeniden deneyin: rm -rf ./session');
    });
  }

  private async saveQRCodeAsPNG(qr: string): Promise<void> {
    try {
      await QRCode.toFile('qr-code.png', qr, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      console.log('📄 QR kodu qr-code.png dosyasına kaydedildi.');
    } catch (error) {
      console.error('❌ QR kod PNG kaydedilemedi:', error);
    }
  }

  private saveQRCodeAsText(qr: string): void {
    try {
      fs.writeFileSync('qr-code.txt', qr);
      console.log('📝 QR kodu qr-code.txt dosyasına kaydedildi (backup).');
    } catch (error) {
      console.error('❌ QR kod text kaydedilemedi:', error);
    }
  }

  private cleanupQRFiles(): void {
    try {
      // QR kod dosyalarını sil (session kaydedildikten sonra gerekmiyor)
      if (fs.existsSync('qr-code.png')) {
        fs.unlinkSync('qr-code.png');
        console.log('🧹 QR kod PNG dosyası temizlendi (artık gerekmiyor).');
      }
      if (fs.existsSync('qr-code.txt')) {
        fs.unlinkSync('qr-code.txt');
        console.log('🧹 QR kod text dosyası temizlendi (artık gerekmiyor).');
      }
    } catch (error) {
      console.warn('⚠️ QR kod dosyaları temizlenirken hata (önemli değil):', error);
    }
  }

  public async initialize(): Promise<void> {
    try {
      console.log('WhatsApp Client başlatılıyor...');
      
      // Timeout ile initialize
      const initTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Initialize timeout - 2 dakika geçti')), 120000);
      });
      
      await Promise.race([
        this.client.initialize(),
        initTimeout
      ]);
      
      console.log('✅ WhatsApp Client initialize tamamlandı');
    } catch (error) {
      console.error('❌ WhatsApp Client başlatılırken hata:', error);
      throw error;
    }
  }

  public async sendMessage(phoneNumber: string, message: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('WhatsApp Client henüz hazır değil');
    }

    try {
      // Numara formatını düzenle
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      await this.client.sendMessage(formattedNumber, message);
      console.log(`Mesaj gönderildi: ${phoneNumber}`);
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
      throw error;
    }
  }

  public async sendMedia(phoneNumber: string, mediaBuffer: Buffer, filename: string, caption?: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('WhatsApp Client henüz hazır değil');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const media = new MessageMedia('image/png', mediaBuffer.toString('base64'), filename);
      
      await this.client.sendMessage(formattedNumber, media, { caption });
      console.log(`Medya gönderildi: ${phoneNumber}`);
    } catch (error) {
      console.error('Medya gönderilirken hata:', error);
      throw error;
    }
  }

  public async sendMediaToMultiple(phoneNumbers: string[], mediaBuffer: Buffer, filename: string, caption?: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('WhatsApp Client henüz hazır değil');
    }

    console.log(`📤 ${phoneNumbers.length} numaraya medya gönderiliyor...`);
    
    const results = await Promise.allSettled(
      phoneNumbers.map(async (phoneNumber, index) => {
        try {
          // Her gönderim arasında kısa bekleme (rate limiting için)
          await new Promise(resolve => setTimeout(resolve, index * 2000));
          
          const formattedNumber = this.formatPhoneNumber(phoneNumber);
          const media = new MessageMedia('image/png', mediaBuffer.toString('base64'), filename);
          
          await this.client.sendMessage(formattedNumber, media, { caption });
          console.log(`✅ Medya gönderildi: ${phoneNumber}`);
          return { phoneNumber, status: 'success' };
        } catch (error) {
          console.error(`❌ ${phoneNumber} numarasına gönderilirken hata:`, error);
          return { phoneNumber, status: 'failed', error };
        }
      })
    );

    // Sonuçları özetle
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`📊 Gönderim sonucu: ${successful} başarılı, ${failed} başarısız`);
    
    // Başarısız olanları logla
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ ${phoneNumbers[index]} numarası başarısız:`, result.reason);
      }
    });
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // +90xxxxxxxxxx formatını 90xxxxxxxxxx@c.us formatına çevir
    let formatted = phoneNumber.replace(/\+/g, '').replace(/\s/g, '');
    return `${formatted}@c.us`;
  }

  public isClientReady(): boolean {
    return this.isReady;
  }

  public async waitUntilReady(): Promise<void> {
    console.log('⏳ WhatsApp Client ready event bekleniyor...');
    
    // Timeout ile ready bekleme
    const readyTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Ready timeout - 3 dakika geçti')), 180000);
    });
    
    await Promise.race([
      this.readyPromise,
      readyTimeout
    ]);
    
    console.log('✅ WhatsApp Client ready event geldi');
  }

  public async destroy(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      console.log('WhatsApp Client kapatıldı.');
    }
  }
} 
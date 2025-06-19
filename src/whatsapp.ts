import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as fs from 'fs';
import * as path from 'path';
import * as qrTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';

export class WhatsAppBot {
  private client: Client;
  private isReady: boolean = false;

  constructor() {
    // LocalAuth kullanarak session'ı kaydet
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: process.env.SESSION_PATH || './session'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // QR kodu konsola yazdır
    this.client.on('qr', async (qr) => {
      console.log('\n🔳 QR Kodu alındı! WhatsApp uygulaması ile aşağıdaki QR kodunu okutun:\n');
      
      // QR kodunu terminalde görsel olarak göster
      qrTerminal.generate(qr, { small: true }, (qrString) => {
        console.log(qrString);
      });
      
      // QR kodunu PNG dosyası olarak kaydet
      await this.saveQRCodeAsPNG(qr);
      
      // QR kodunu metin olarak da kaydet (backup)
      this.saveQRCodeAsText(qr);
      
      console.log('\n📱 QR kodu taratın veya qr-code.png dosyasını açarak telefonunuzla okutun\n');
    });

    // Client hazır olduğunda
    this.client.on('ready', () => {
      console.log('WhatsApp Client hazır!');
      this.isReady = true;
    });

    // Bağlantı kesildiğinde
    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp Client bağlantısı kesildi:', reason);
      this.isReady = false;
    });

    // Hata durumları
    this.client.on('auth_failure', (msg) => {
      console.error('Kimlik doğrulama hatası:', msg);
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

  public async initialize(): Promise<void> {
    try {
      console.log('WhatsApp Client başlatılıyor...');
      await this.client.initialize();
    } catch (error) {
      console.error('WhatsApp Client başlatılırken hata:', error);
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

  public async destroy(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      console.log('WhatsApp Client kapatıldı.');
    }
  }
} 
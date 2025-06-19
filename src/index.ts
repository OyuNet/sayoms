import 'dotenv/config';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import * as cron from 'node-cron';
import { WhatsAppBot } from './whatsapp.js';
import { ImageGenerator } from './imageGenerator.js';
import type { ProgressData } from './imageGenerator.js';

// dayjs duration plugin'ini etkinleştir
dayjs.extend(duration);

class TravelProgressBot {
  private whatsappBot: WhatsAppBot;
  private imageGenerator: ImageGenerator;
  private startTime: dayjs.Dayjs;
  private endTime: dayjs.Dayjs;
  private phoneNumbers: string[];

  constructor() {
    // Zaman bilgilerini ayarla
    this.startTime = dayjs(process.env.START_TIME);
    this.endTime = dayjs(process.env.END_TIME);

    // Numara listesini parse et (virgülle ayrılmış)
    const phoneNumbersString = process.env.PHONE_NUMBERS || process.env.PHONE_NUMBER || '';
    this.phoneNumbers = phoneNumbersString
      .split(',')
      .map(num => num.trim())
      .filter(num => num.length > 0);

    // Ortam değişkenlerini kontrol et
    this.validateEnvironmentVariables();

    // Servisleri başlat
    this.whatsappBot = new WhatsAppBot();
    this.imageGenerator = new ImageGenerator();

    console.log('🚌 Otobüs Yolculuğu Progress Bot başlatılıyor...');
    console.log(`📅 Başlangıç: ${this.startTime.format('DD/MM/YYYY HH:mm')}`);
    console.log(`📅 Bitiş: ${this.endTime.format('DD/MM/YYYY HH:mm')}`);
    console.log(`📱 WhatsApp Numaraları (${this.phoneNumbers.length}):`, this.phoneNumbers);
  }

  private validateEnvironmentVariables(): void {
    const requiredVars = ['START_TIME', 'END_TIME'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    // Telefon numarası kontrolü - PHONE_NUMBERS veya PHONE_NUMBER olmalı
    if (!process.env.PHONE_NUMBERS && !process.env.PHONE_NUMBER) {
      missingVars.push('PHONE_NUMBERS or PHONE_NUMBER');
    }

    if (missingVars.length > 0) {
      console.error('❌ Eksik ortam değişkenleri:', missingVars.join(', '));
      console.error('🔧 .env dosyanızı kontrol edin ve eksik değişkenleri ekleyin.');
      console.error('💡 PHONE_NUMBERS=+905551234567,+905559876543 formatında birden fazla numara ekleyebilirsiniz.');
      process.exit(1);
    }

    // Numara listesi boş mu kontrol et
    if (this.phoneNumbers.length === 0) {
      console.error('❌ Geçerli telefon numarası bulunamadı!');
      console.error('🔧 .env dosyasında PHONE_NUMBERS veya PHONE_NUMBER tanımlayın.');
      process.exit(1);
    }
  }

  private calculateProgress(): ProgressData {
    const now = dayjs();
    const totalDuration = this.endTime.diff(this.startTime);
    const elapsedDuration = now.diff(this.startTime);
    const remainingDuration = this.endTime.diff(now);

    // Yolculuk henüz başlamadıysa
    if (now.isBefore(this.startTime)) {
      return {
        percent: 0,
        elapsed: '00:00',
        remaining: dayjs.duration(this.endTime.diff(this.startTime)).format('HH:mm'),
        startTime: this.startTime.format('HH:mm'),
        endTime: this.endTime.format('HH:mm')
      };
    }

    // Yolculuk bittiyse
    if (now.isAfter(this.endTime)) {
      return {
        percent: 100,
        elapsed: dayjs.duration(totalDuration).format('HH:mm'),
        remaining: '00:00',
        startTime: this.startTime.format('HH:mm'),
        endTime: this.endTime.format('HH:mm')
      };
    }

    // Yolculuk devam ediyorsa
    const percentCompleted = (elapsedDuration / totalDuration) * 100;

    return {
      percent: percentCompleted,
      elapsed: dayjs.duration(elapsedDuration).format('HH:mm'),
      remaining: dayjs.duration(remainingDuration).format('HH:mm'),
      startTime: this.startTime.format('HH:mm'),
      endTime: this.endTime.format('HH:mm')
    };
  }

  private async sendProgressUpdate(): Promise<void> {
    try {
      if (!this.whatsappBot.isClientReady()) {
        console.log('⏳ WhatsApp Client henüz hazır değil, atlaniyor...');
        return;
      }

      const progressData = this.calculateProgress();

      console.log('📊 Progress hesaplandı:', {
        percent: progressData.percent.toFixed(1),
        elapsed: progressData.elapsed,
        remaining: progressData.remaining
      });

      // Progress görselini oluştur
      const imageBuffer = await this.imageGenerator.generateProgressImage(progressData);

      // WhatsApp'a gönder
      const caption = `🚌 Yolculuk Durumu\n\n` +
        `⏱️ Geçen Süre: ${progressData.elapsed}\n` +
        `⏰ Kalan Süre: ${progressData.remaining}\n` +
        `📊 İlerleme: %${progressData.percent.toFixed(1)}`;

      // Tüm numaralara gönder
      await this.whatsappBot.sendMediaToMultiple(
        this.phoneNumbers,
        imageBuffer,
        'yolculuk-durumu.png',
        caption
      );

      console.log('✅ Progress güncelleme gönderildi!');

    } catch (error) {
      console.error('❌ Progress gönderilirken hata:', error);
    }
  }

  private setupCronJob(): void {
    // Her 30 dakikada bir çalış
    cron.schedule('*/30 * * * *', async () => {
      console.log('🔄 Scheduled update çalışıyor...');
      await this.sendProgressUpdate();
    });

    console.log('⏰ Cron job kuruldu - Her 30 dakikada bir güncelleme');
  }

  public async start(): Promise<void> {
    try {
      // WhatsApp bağlantısını başlat
      await this.whatsappBot.initialize().then(async () => {
        // İlk güncellemeyi gönder
        console.log('📤 İlk progress güncellemesi gönderiliyor...');
        await this.sendProgressUpdate();
      })

      // Cron job'ı kur
      this.setupCronJob();

      console.log('🎉 Bot başarıyla başlatıldı ve çalışıyor!');

    } catch (error) {
      console.error('❌ Bot başlatılırken hata:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    console.log('🛑 Bot kapatılıyor...');
    await this.whatsappBot.destroy();
    process.exit(0);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT sinyali alındı...');
  if (bot) {
    await bot.stop();
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM sinyali alındı...');
  if (bot) {
    await bot.stop();
  }
});

// Bot'u başlat
const bot = new TravelProgressBot();
bot.start().catch((error) => {
  console.error('💥 Uygulama başlatılırken kritik hata:', error);
  process.exit(1);
}); 
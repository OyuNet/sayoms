#!/usr/bin/env bun
import * as fs from 'fs';
import * as path from 'path';

const resetSession = () => {
  console.log('🧹 WhatsApp Session Temizleme Scripti\n');

  const sessionPath = process.env.SESSION_PATH || './session';
  const qrFiles = ['qr-code.png', 'qr-code.txt'];

  // Session klasörünü temizle
  if (fs.existsSync(sessionPath)) {
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log(`✅ Session klasörü temizlendi: ${sessionPath}`);
    } catch (error) {
      console.error(`❌ Session klasörü temizlenirken hata:`, error);
    }
  } else {
    console.log(`ℹ️  Session klasörü zaten mevcut değil: ${sessionPath}`);
  }

  // QR kod dosyalarını temizle
  let qrFilesRemoved = 0;
  qrFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`✅ QR dosyası temizlendi: ${file}`);
        qrFilesRemoved++;
      } catch (error) {
        console.error(`❌ QR dosyası temizlenirken hata (${file}):`, error);
      }
    }
  });

  if (qrFilesRemoved === 0) {
    console.log(`ℹ️  QR kod dosyaları zaten mevcut değil`);
  }

  console.log('\n🎉 Temizlik tamamlandı!');
  console.log('📱 Şimdi botu yeniden başlatın: bun start');
  console.log('🔳 Yeni QR kod oluşturulacak ve okutmanız gerekecek\n');
};

resetSession(); 
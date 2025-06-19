import { createCanvas, CanvasRenderingContext2D } from 'canvas';

export interface ProgressData {
  percent: number;
  elapsed: string;
  remaining: string;
  startTime: string;
  endTime: string;
}

export class ImageGenerator {
  private readonly width = 750;
  private readonly height = 225;

  public async generateProgressImage(data: ProgressData): Promise<Buffer> {
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext('2d');

    // Arka planı temizle
    this.clearBackground(ctx);
    
    // Progress bar çiz
    this.drawProgressBar(ctx, data.percent);
    
    // Metin bilgilerini çiz
    this.drawTexts(ctx, data);

    // PNG buffer olarak dön
    return canvas.toBuffer('image/png');
  }

  private clearBackground(ctx: CanvasRenderingContext2D): void {
    // Arka plan rengi - koyu gri
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, this.width, this.height);
    
    // Çerçeve
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, this.width - 2, this.height - 2);
  }

  private drawProgressBar(ctx: CanvasRenderingContext2D, percent: number): void {
    const barWidth = this.width - 40;
    const barHeight = 20;
    const barX = 20;
    const barY = this.height - 50;

    // Progress bar arka planı
    ctx.fillStyle = '#34495e';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.strokeStyle = '#5d6d7e';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Progress bar dolum
    const fillWidth = (barWidth * percent) / 100;
    
    // Gradient oluştur
    const gradient = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
    gradient.addColorStop(0, '#27ae60');
    gradient.addColorStop(0.5, '#2ecc71');
    gradient.addColorStop(1, '#58d68d');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, fillWidth, barHeight);
  }

  private drawTexts(ctx: CanvasRenderingContext2D, data: ProgressData): void {
    ctx.fillStyle = '#ecf0f1';
    ctx.textAlign = 'center';

    // Başlık
    ctx.font = 'bold 18px Arial';
    ctx.fillText('🚌 Yolculuk Durumu', this.width / 2, 30);

    // Yüzde bilgisi
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(`Kalan: %${(100 - data.percent).toFixed(1)}`, this.width / 2, 60);

    // Zaman bilgileri
    ctx.font = '12px Arial';
    ctx.fillStyle = '#bdc3c7';
    ctx.textAlign = 'left';
    
    const leftX = 20;
    const timeY = 90;
    
    ctx.fillText(`Geçen: ${data.elapsed}`, leftX, timeY);
    ctx.fillText(`Kalan: ${data.remaining}`, leftX, timeY + 15);
    
    ctx.textAlign = 'right';
    const rightX = this.width - 20;
    
    ctx.fillText(`Başlangıç: ${data.startTime}`, rightX, timeY);
    ctx.fillText(`Bitiş: ${data.endTime}`, rightX, timeY + 15);

    // Progress yüzdesi (bar üzerinde)
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`%${data.percent.toFixed(1)}`, this.width / 2, this.height - 35);
  }
} 
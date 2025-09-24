import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Api } from '../../../../core/services/api';
import { Router } from '@angular/router';
import Quagga from 'quagga';
import jsQR from 'jsqr';
interface OcrResult {
  amount: number;
  date: Date;
  vendor: string;
    confidence?: number;
  rawText?: string;
}
@Component({
  selector: 'app-upload-bill',
  standalone: false,
  templateUrl: './upload-bill.html',
  styleUrl: './upload-bill.css'
})
export class UploadBill implements OnDestroy{
  selectedFile: File | null = null;
  loading = false;
  ocrResult: OcrResult | null = null;
  errorMessage = '';
  successMessage = '';
  currentMode: 'file' | 'qr' = 'file';
  isScanning = false;
  


  // QR Scanner properties (keep ElementRef separate from native elements)
  @ViewChild('videoElement') videoElementRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElementRef!: ElementRef<HTMLCanvasElement>;

  private videoStream: MediaStream | null = null;
  private canvasEl!: HTMLCanvasElement | null;
  private canvasContext!: CanvasRenderingContext2D | null;
  private animationFrame: number | null = null;
  constructor(private apiService: Api, private router: Router ) {}

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    this.ocrResult = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

extractData() {
  if (!this.selectedFile) {
    this.errorMessage = 'Please select a file first';
    return;
  }

  this.loading = true;
  this.errorMessage = '';
  const formData = new FormData();
  formData.append('file', this.selectedFile); // Key should match backend expectation

  this.apiService.postFormData<OcrResult>('/employee/ocr/extract', formData).subscribe({
    next: (response) => {
      this.loading = false;
      if (response.success && response.data) {
        this.ocrResult = response.data;
        this.successMessage = 'Data extracted successfully!';
      } else {
        this.errorMessage = 'Failed to extract data from bill';
      }
    },
    error: (error) => {
      this.loading = false;
      this.errorMessage = error.error?.error || 'Error extracting data from bill';
      console.error('OCR error:', error);
    }
  });
}
 useExtractedData() {
    if (this.ocrResult) {
      // Store the extracted data in local storage to use in the raise claim form
      localStorage.setItem('extractedBillData', JSON.stringify(this.ocrResult));
      this.router.navigate(['/employee/raise-claim']);
    }
  }

   switchMode(mode: 'file' | 'qr') {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.errorMessage = '';
    this.successMessage = '';
    this.ocrResult = null;
    if (mode === 'qr') {
      this.startQrScanner().catch(err => {
        console.error('startQrScanner failed', err);
      });
    } else {
      this.stopQrScanner();
    }
  }

  async startQrScanner() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.errorMessage = 'Camera access is not supported by your browser';
      return;
    }

    try {
      this.isScanning = true;
      this.errorMessage = '';

      // ask for camera (prefer environment)
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      // attach to video
      const video = this.videoElementRef.nativeElement;
      video.srcObject = this.videoStream;
      await video.play();

      // setup canvas references
      this.canvasEl = this.canvasElementRef.nativeElement;
      this.canvasContext = this.canvasEl.getContext('2d');

      // begin scanning loop
      this.scanQRCode();
    } catch (err) {
      console.error('Error accessing camera:', err);
      this.errorMessage = 'Cannot access camera. Please check permissions.';
      this.isScanning = false;
      // clean up if partially started
      this.stopQrScanner();
    }
  }

  private scanQRCode() {
    if (!this.isScanning) return;

    const video = this.videoElementRef?.nativeElement;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      // continue loop until ready
      this.animationFrame = requestAnimationFrame(() => this.scanQRCode());
      return;
    }

    // ensure canvas size matches video
    if (!this.canvasEl || !this.canvasContext) {
      this.animationFrame = requestAnimationFrame(() => this.scanQRCode());
      return;
    }

    this.canvasEl.width = video.videoWidth;
    this.canvasEl.height = video.videoHeight;
    this.canvasContext.drawImage(video, 0, 0, this.canvasEl.width, this.canvasEl.height);

    try {
      const imageData = this.canvasContext.getImageData(0, 0, this.canvasEl.width, this.canvasEl.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

      if (code && code.data) {
        // Found QR code text - try to parse JSON, but handle plain strings too
        this.handleQrRawData(code.data);
        // stop scanning after a successful read
        this.stopQrScanner();
        return;
      }
    } catch (err) {
      console.error('Error scanning frame', err);
    }

    // continue scanning
    this.animationFrame = requestAnimationFrame(() => this.scanQRCode());
  }

  private handleQrRawData(raw: string) {
    // try parse as JSON; fallback to send as raw string to server
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // not JSON — server may still parse structured text
      parsed = null;
    }

    if (parsed && parsed.amount && parsed.date && parsed.vendor) {
      // If JSON contains required fields, we can use directly or still validate on server
      this.sendQrToServer(parsed);
    } else {
      // send raw to server to let server attempt parsing/validation
      this.sendQrToServer({ rawText: raw });
    }
  }

  private sendQrToServer(qrDataPayload: any) {
    // call backend endpoint that you already have: POST /employee/qr/process
    this.loading = true;
    this.apiService.post('/employee/qr/process', { qrData: qrDataPayload }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.success && res?.data) {
          // server returns parsed structured result similar to OCR
          this.ocrResult = res.data;
          this.successMessage = 'QR code processed successfully!';
          this.errorMessage = '';
        } else {
          this.errorMessage = res?.error || 'QR processing failed';
          this.successMessage = '';
        }
      },
      error: (err: any) => {
        this.loading = false;
        console.error('QR server error', err);
        this.errorMessage = err.error?.error || 'Error processing QR on server';
        this.successMessage = '';
      }
    });
  }

  stopQrScanner() {
    this.isScanning = false;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }

    try {
      const video = this.videoElementRef?.nativeElement;
      if (video) video.srcObject = null;
    } catch (err) {
      // ignore
    }
  }

  ngOnDestroy() {
    this.stopQrScanner();
  }
}
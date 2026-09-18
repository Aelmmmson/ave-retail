import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, AlertTriangle, RefreshCw, Keyboard, Zap, Volume2, CheckCircle2, Sparkles } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Real-Time Barcode Scanner'
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const [activeEngine, setActiveEngine] = useState<'html5-zxing' | 'native'>('html5-zxing');
  const [isNativeSupported, setIsNativeSupported] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualInputVal, setManualInputVal] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Initializing camera feed...');
  const [recentScanSuccess, setRecentScanSuccess] = useState<string | null>(null);

  // Synthesize crisp audio beep on barcode detection
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz (A5 pitch)
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // AudioContext muted/blocked notice
    }
  };

  // Safely handle scanned barcode with 1.5s deduplication guard
  const handleScannedBarcode = (rawCode: string) => {
    const cleanCode = rawCode.replace(/[\r\n\t]/g, '').trim();
    if (!cleanCode) return;

    const now = Date.now();
    if (lastScannedRef.current.code === cleanCode && (now - lastScannedRef.current.time) < 1500) {
      return;
    }

    lastScannedRef.current = { code: cleanCode, time: now };
    playScanBeep();
    setRecentScanSuccess(cleanCode);
    setTimeout(() => setRecentScanSuccess(null), 1200);

    onScan(cleanCode);
  };

  // Keyboard Wedge Listener for Hardware Barcode Guns (Enter / Tab)
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const codeToSubmit = manualInputVal.trim();
      if (codeToSubmit) {
        handleScannedBarcode(codeToSubmit);
        setManualInputVal('');
      }
    }
  };

  // Stop camera stream & cleanup active decoder loops
  const stopCameraTracks = async () => {
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        await html5QrcodeRef.current.clear();
      } catch (err) {
        console.warn('Html5Qrcode teardown notice:', err);
      } finally {
        html5QrcodeRef.current = null;
      }
    }
  };

  // Camera Initialization effect
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const hasNative = 'BarcodeDetector' in window;
    setIsNativeSupported(hasNative);

    const initScanner = async () => {
      setErrorMessage(null);
      await stopCameraTracks();

      if (activeEngine === 'html5-zxing') {
        setStatusMessage('Starting ZXing JavaScript Decoder (Optimized for Webcams & 1D Barcodes)...');
        try {
          await new Promise((resolve) => setTimeout(resolve, 150));
          const containerElem = document.getElementById('html5qr-code-scanner-container');
          if (!containerElem || !isMounted) return;

          const html5Qrcode = new Html5Qrcode('html5qr-code-scanner-container');
          html5QrcodeRef.current = html5Qrcode;

          const qrConfig = {
            fps: 20,
            qrbox: { width: 280, height: 180 },
            aspectRatio: 1.3333
          };

          try {
            await html5Qrcode.start(
              { facingMode: 'environment' },
              qrConfig,
              (decodedText) => {
                if (isMounted) handleScannedBarcode(decodedText);
              },
              () => {}
            );
          } catch (camErr) {
            await html5Qrcode.start(
              { facingMode: 'user' },
              qrConfig,
              (decodedText) => {
                if (isMounted) handleScannedBarcode(decodedText);
              },
              () => {}
            );
          }

          if (isMounted) {
            setStatusMessage('Webcam Scanner Active (ZXing Engine). Align barcode in box.');
          }
        } catch (fallbackErr: any) {
          console.error('ZXing decoder camera init failed:', fallbackErr);
          if (fallbackErr.name === 'NotAllowedError' || fallbackErr.toString().includes('Permission')) {
            setErrorMessage('Camera permission denied. Please allow camera access in browser settings.');
          } else if (fallbackErr.name === 'NotFoundError' || fallbackErr.toString().includes('NotFound')) {
            setErrorMessage('No camera device detected on this system.');
          } else {
            setErrorMessage(`Camera initialization error: ${fallbackErr.message || fallbackErr}`);
          }
        }
      } else {
        // Native BarcodeDetector Engine
        setStatusMessage('Starting Native BarcodeDetector Engine...');
        try {
          let stream: MediaStream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
          } catch (cErr) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          }

          if (!isMounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }

          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'code_39', 'codabar', 'itf']
          });

          setStatusMessage('Native BarcodeDetector Active. Align barcode in box.');

          let lastScanTime = 0;
          const scanFrame = async (timestamp: number) => {
            if (!isMounted) return;

            if (timestamp - lastScanTime >= 100) {
              lastScanTime = timestamp;
              if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  const barcodes = await barcodeDetector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0 && isMounted) {
                    const rawVal = barcodes[0].rawValue;
                    if (rawVal) handleScannedBarcode(rawVal);
                  }
                } catch (detectErr) {}
              }
            }
            if (isMounted) {
              animFrameIdRef.current = requestAnimationFrame(scanFrame);
            }
          };

          animFrameIdRef.current = requestAnimationFrame(scanFrame);
        } catch (err: any) {
          console.error('Native camera init failed:', err);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setErrorMessage('Camera access denied. Please allow camera permissions in browser settings.');
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setErrorMessage('No camera device detected on this system.');
          } else {
            setErrorMessage(`Failed to start camera: ${err.message || 'Unknown error'}`);
          }
        }
      }
    };

    initScanner();

    return () => {
      isMounted = false;
      stopCameraTracks();
    };
  }, [isOpen, activeEngine]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                {title}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Webcam & Hardware Scanner Interface
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraTracks();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Switcher Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveEngine('html5-zxing')}
            className={`flex-1 py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
              activeEngine === 'html5-zxing'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>ZXing JS Engine (Best for Webcams)</span>
          </button>
          {isNativeSupported && (
            <button
              type="button"
              onClick={() => setActiveEngine('native')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                activeEngine === 'native'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Native Chrome Engine</span>
            </button>
          )}
        </div>

        {/* Viewfinder Display Box */}
        <div className={`relative w-full h-56 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 transition-all duration-300 ${
          recentScanSuccess ? 'border-emerald-500 ring-4 ring-emerald-500/30' : 'border-teal-500/40 shadow-inner'
        }`}>
          {errorMessage ? (
            <div className="p-4 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto animate-bounce" />
              <p className="text-xs font-semibold text-rose-400">{errorMessage}</p>
              <p className="text-[11px] text-slate-400">
                Use the manual input box or hardware gun below to submit barcodes.
              </p>
            </div>
          ) : activeEngine === 'native' ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Laser Beam */}
              <div className="absolute inset-x-4 top-1/2 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse pointer-events-none" />
              
              {/* Viewfinder Target */}
              <div className="absolute w-52 h-32 border-2 border-teal-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-1">
                <div className="flex justify-between">
                  <div className="w-3.5 h-3.5 border-t-2 border-l-2 border-teal-400"></div>
                  <div className="w-3.5 h-3.5 border-t-2 border-r-2 border-teal-400"></div>
                </div>
                <div className="flex justify-between">
                  <div className="w-3.5 h-3.5 border-b-2 border-l-2 border-teal-400"></div>
                  <div className="w-3.5 h-3.5 border-b-2 border-r-2 border-teal-400"></div>
                </div>
              </div>
            </>
          ) : (
            // HTML5 / ZXing Container
            <div id="html5qr-code-scanner-container" className="w-full h-full overflow-hidden" />
          )}

          {/* Scanned Success Visual Badge Overlay */}
          {recentScanSuccess && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-1.5 animate-in zoom-in duration-150 z-20">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
              <span className="font-extrabold text-sm text-white">Barcode Scanned!</span>
              <span className="font-mono text-xs text-emerald-300 bg-emerald-900/60 px-3 py-1 rounded-lg border border-emerald-500/40">{recentScanSuccess}</span>
            </div>
          )}
        </div>

        {/* Guidance Tip & Status Message */}
        <div className="text-center space-y-1">
          <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold flex items-center justify-center gap-1">
            <Volume2 className="w-3.5 h-3.5" />
            <span>{statusMessage}</span>
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            💡 <strong>Scanning Tip:</strong> Hold product flat <strong>15–20cm (6–8 inches)</strong> from camera in clear light so lines are sharp.
          </p>
        </div>

        {/* Hardware Barcode Gun / Manual Input Box */}
        <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-teal-500" /> Hardware Barcode Gun / Manual Entry
            </span>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">Press Enter or Tab</span>
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={manualInputVal}
              onChange={(e) => setManualInputVal(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Scan with hardware gun or type code..."
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-teal-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                if (manualInputVal.trim()) {
                  handleScannedBarcode(manualInputVal);
                  setManualInputVal('');
                }
              }}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Use Code
            </button>
          </div>
        </div>

        {/* Quick Test Barcode Buttons */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-medium">
            Test Barcode Triggers:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleScannedBarcode('600100010001')}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white rounded-xl text-center transition cursor-pointer"
            >
              <div className="text-[10px] font-bold truncate">Ideal Milk</div>
              <div className="font-mono text-[9px] opacity-75">600100010001</div>
            </button>

            <button
              type="button"
              onClick={() => handleScannedBarcode('5449000000996')}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white rounded-xl text-center transition cursor-pointer"
            >
              <div className="text-[10px] font-bold truncate">Coca-Cola</div>
              <div className="font-mono text-[9px] opacity-75">5449000000996</div>
            </button>

            <button
              type="button"
              onClick={() => handleScannedBarcode('600100020002')}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white rounded-xl text-center transition cursor-pointer"
            >
              <div className="text-[10px] font-bold truncate">Milo 400g</div>
              <div className="font-mono text-[9px] opacity-75">600100020002</div>
            </button>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => {
              stopCameraTracks();
              onClose();
            }}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            Close Scanner
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Html5Qrcode } from 'html5-qrcode';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(0, 0, 0, 0.5);
`;

const Title = styled.h2`
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .material-symbols-outlined {
    font-size: 24px;
  }
`;

const ScannerContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ScannerViewport = styled.div`
  width: 100%;
  max-width: 400px;
  aspect-ratio: 1;
  border-radius: 16px;
  overflow: hidden;
  position: relative;

  & > div {
    width: 100% !important;
    height: 100% !important;
  }

  video {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
  }
`;

const ScanFrame = styled.div`
  position: absolute;
  inset: 20%;
  border: 3px solid #22c55e;
  border-radius: 12px;
  pointer-events: none;
  z-index: 10;

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-color: #22c55e;
    border-style: solid;
  }

  &::before {
    top: -3px;
    left: -3px;
    border-width: 4px 0 0 4px;
    border-radius: 8px 0 0 0;
  }

  &::after {
    top: -3px;
    right: -3px;
    border-width: 4px 4px 0 0;
    border-radius: 0 8px 0 0;
  }
`;

const ScanFrameBottom = styled.div`
  position: absolute;
  inset: 20%;
  pointer-events: none;
  z-index: 10;

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-color: #22c55e;
    border-style: solid;
  }

  &::before {
    bottom: -3px;
    left: -3px;
    border-width: 0 0 4px 4px;
    border-radius: 0 0 0 8px;
  }

  &::after {
    bottom: -3px;
    right: -3px;
    border-width: 0 4px 4px 0;
    border-radius: 0 0 8px 0;
  }
`;

const Instructions = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  text-align: center;
  margin-top: 20px;
  max-width: 300px;
`;

const PermissionPrompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  max-width: 300px;

  .material-symbols-outlined {
    font-size: 64px;
    color: #94a3b8;
  }

  h3 {
    color: white;
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }

  p {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    margin: 0;
    line-height: 1.5;
  }
`;

const PermissionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  border: none;
  background: #22c55e;
  color: white;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  margin-top: 8px;

  &:hover {
    background: #16a34a;
    transform: scale(1.02);
  }

  &:active {
    transform: scale(0.98);
  }

  .material-symbols-outlined {
    font-size: 24px;
    color: white;
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: white;

  .material-symbols-outlined {
    font-size: 48px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const CancelButton = styled.button`
  margin-top: 8px;
  padding: 12px 32px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  background: transparent;
  color: white;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.7);
  }

  &:active {
    transform: scale(0.97);
  }
`;

const SuccessState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #22c55e;

  .material-symbols-outlined {
    font-size: 64px;
  }

  p {
    color: white;
    font-size: 16px;
    text-align: center;
  }
`;

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isProcessing?: boolean;
  successMessage?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  onClose,
  isProcessing = false,
  successMessage,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('checking');
  const isRunningRef = useRef(false);
  const scannedRef = useRef(false);

  // Check and request camera permission
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Camera not supported on this device or browser.');
          setPermissionState('denied');
          setIsStarting(false);
          return;
        }

        // Try to get permission status if available
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
            if (result.state === 'denied') {
              setPermissionState('denied');
              setError('Camera permission was denied. Please enable camera access in your browser settings.');
              setIsStarting(false);
              return;
            }
            setPermissionState(result.state as 'prompt' | 'granted');
          } catch {
            // permissions.query might not support 'camera', continue anyway
            setPermissionState('prompt');
          }
        } else {
          setPermissionState('prompt');
        }

        // Request camera access to trigger permission prompt
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        // Stop the stream immediately - we just needed it for permission
        stream.getTracks().forEach(track => track.stop());

        setPermissionState('granted');
      } catch (err) {
        console.error('Permission check error:', err);
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setPermissionState('denied');
            setError('Camera permission denied. Please allow camera access to scan barcodes.');
          } else if (err.name === 'NotFoundError') {
            setPermissionState('denied');
            setError('No camera found on this device.');
          } else {
            setPermissionState('denied');
            setError('Failed to access camera. Please try again.');
          }
        }
        setIsStarting(false);
      }
    };

    checkPermission();
  }, []);

  // Start scanner after permission is granted
  useEffect(() => {
    if (permissionState !== 'granted') return;

    const containerId = 'barcode-scanner-viewport';
    let mounted = true;

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1,
          },
          (decodedText) => {
            // Prevent multiple scans
            if (scannedRef.current) return;
            scannedRef.current = true;

            // Vibrate on success if supported
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }

            onScan(decodedText);
          },
          () => {
            // Ignore scan failures (no barcode in frame)
          }
        );

        if (mounted) {
          setIsStarting(false);
          isRunningRef.current = true;
        }
      } catch (err) {
        console.error('Scanner error:', err);
        if (mounted) {
          setIsStarting(false);
          isRunningRef.current = false;
          if (err instanceof Error) {
            setError('Failed to start scanner. Please try again.');
          }
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current && isRunningRef.current) {
        isRunningRef.current = false;
        scannerRef.current.stop().catch(() => {
          // Ignore stop errors on unmount
        });
      }
    };
  }, [onScan, permissionState]);

  // Stop scanner when processing or showing success
  useEffect(() => {
    if ((isProcessing || successMessage) && scannerRef.current && isRunningRef.current) {
      isRunningRef.current = false;
      scannerRef.current.stop().catch(() => {
        // Ignore - scanner might already be stopped
      });
    }
  }, [isProcessing, successMessage]);

  return (
    <Overlay>
      <Header>
        <Title>Scan Barcode</Title>
        <CloseButton onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </CloseButton>
      </Header>

      <ScannerContainer>
        {isProcessing ? (
          <LoadingState>
            <span className="material-symbols-outlined">hourglass_empty</span>
            <p>Looking up product...</p>
            <CancelButton onClick={onClose}>Cancel</CancelButton>
          </LoadingState>
        ) : successMessage ? (
          <SuccessState>
            <span className="material-symbols-outlined">check_circle</span>
            <p>{successMessage}</p>
          </SuccessState>
        ) : permissionState === 'checking' ? (
          <LoadingState>
            <span className="material-symbols-outlined">photo_camera</span>
            <p>Checking camera access...</p>
          </LoadingState>
        ) : permissionState === 'denied' || error ? (
          <PermissionPrompt>
            <span className="material-symbols-outlined">no_photography</span>
            <h3>Camera Access Required</h3>
            <p>{error || 'Please allow camera access to scan barcodes.'}</p>
            <PermissionButton onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
              Close
            </PermissionButton>
          </PermissionPrompt>
        ) : (
          <>
            <ScannerViewport>
              <div id="barcode-scanner-viewport" />
              {!isStarting && !error && permissionState === 'granted' && (
                <>
                  <ScanFrame />
                  <ScanFrameBottom />
                </>
              )}
            </ScannerViewport>

            {isStarting && permissionState === 'granted' && (
              <LoadingState>
                <span className="material-symbols-outlined">photo_camera</span>
                <p>Starting camera...</p>
              </LoadingState>
            )}

            {!isStarting && !error && permissionState === 'granted' && (
              <Instructions>
                Point the camera at a product barcode. It will scan automatically.
              </Instructions>
            )}
          </>
        )}
      </ScannerContainer>
    </Overlay>
  );
};

import { useCallback, useLayoutEffect, MutableRefObject } from "react";
import Quagga from "@ericblade/quagga2";

function getMedian(arr: number[]): number {
  arr.sort((a, b) => a - b);
  const half = Math.floor(arr.length / 2);
  if (arr.length % 2 === 1) {
    return arr[half];
  }
  return (arr[half - 1] + arr[half]) / 2;
  // 以下でもいいかも
  //   return pool[Math.floor((pool.length - 1) / 2)];
}

function getMedianOfCodeErrors(decodedCodes: object[]) {
  const errors = decodedCodes
    .filter((x: any) => x.error !== undefined)
    .map((x: any) => x.error);
  const medianOfErrors = getMedian(errors);
  return medianOfErrors;
}

const defaultConstraints = {
  width: 640,
  height: 480,
};

const defaultLocatorSettings = {
  patchSize: "medium",
  halfSample: true,
};

const defaultDecoders = ["ean_reader"];

interface ScannerProps {
  onDetected: (input: any) => any;
  scannerRef: MutableRefObject<any>;
  onScannerReady?: () => any;
  cameraId?: string;
  facingMode?: string;
  constraints?: object;
  locator?: object;
  numOfWorkers?: number;
  decoders?: any[];
  locate?: boolean;
}

export const Scanner = ({
  onDetected,
  scannerRef,
  onScannerReady,
  cameraId,
  facingMode,
  constraints = defaultConstraints,
  locator = defaultLocatorSettings,
  numOfWorkers = navigator.hardwareConcurrency || 0,
  decoders = defaultDecoders,
  locate = true,
}: ScannerProps) => {
  const errorCheck = useCallback(
    (result) => {
      if (!onDetected) {
        return;
      }
      const err = getMedianOfCodeErrors(result.codeResult.decodedCodes);
      // if Quagga is at least 75% certain that it read correctly, then accept the code.
      if (err < 0.25) {
        onDetected(result.codeResult.code);
      }
    },
    [onDetected]
  );

  const handleProcessed = (result: any) => {
    const drawingCtx = Quagga.canvas.ctx.overlay;
    const drawingCanvas = Quagga.canvas.dom.overlay;
    drawingCtx.font = "24px Arial";
    drawingCtx.fillStyle = "green";

    if (result) {
      // console.warn('* quagga onProcessed', result);
      if (result.boxes) {
        drawingCtx.clearRect(
          0,
          0,
          parseInt(drawingCanvas.getAttribute("width") ?? ""),
          parseInt(drawingCanvas.getAttribute("height") ?? "")
        );
        result.boxes
          .filter((box: any) => box !== result.box)
          .forEach((box: any) => {
            Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, {
              color: "purple",
              lineWidth: 2,
            });
          });
      }
      if (result.box) {
        Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, {
          color: "blue",
          lineWidth: 2,
        });
      }
      if (result.codeResult && result.codeResult.code) {
        // const validated = barcodeValidator(result.codeResult.code);
        // const validated = validateBarcode(result.codeResult.code);
        // Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, { color: validated ? 'green' : 'red', lineWidth: 3 });
        drawingCtx.font = "24px Arial";
        // drawingCtx.fillStyle = validated ? 'green' : 'red';
        // drawingCtx.fillText(`${result.codeResult.code} valid: ${validated}`, 10, 50);
        drawingCtx.fillText(result.codeResult.code, 10, 20);
        // if (validated) {
        //     onDetected(result);
        // }
      }
    }
  };

  useLayoutEffect(() => {
    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          constraints: {
            ...constraints,
            ...(cameraId && { deviceId: cameraId }),
            ...(!cameraId && { facingMode }),
          },
          target: scannerRef.current,
        },
        locator,
        numOfWorkers,
        decoder: { readers: decoders },
        locate,
      },
      (err) => {
        Quagga.onProcessed(handleProcessed);

        if (err) {
          return console.log("Error starting Quagga:", err);
        }
        if (scannerRef && scannerRef.current) {
          Quagga.start();
          if (onScannerReady) {
            onScannerReady();
          }
        }
      }
    );
    Quagga.onDetected(errorCheck);
    return () => {
      Quagga.offDetected(errorCheck);
      Quagga.offProcessed(handleProcessed);
      Quagga.stop();
    };
  }, [
    cameraId,
    onDetected,
    onScannerReady,
    scannerRef,
    errorCheck,
    constraints,
    locator,
    decoders,
    locate,
  ]);
  return null;
};

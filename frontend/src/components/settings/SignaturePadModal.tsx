import "./SignaturePadModal.css";
import { Eraser, PenLine } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { FormModal } from "@/components/ui/FormModal";

const INK = "#1c252e";
const STROKE_WIDTH = 2.4;
const FALLBACK_WIDTH = 480;
const FALLBACK_HEIGHT = 200;

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Bounding box of the opaque pixels, or null when the canvas holds no ink. */
export function contentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] === 0) {
        continue;
      }
      if (x < minX) {
        minX = x;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (y > maxY) {
        maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    return null;
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Exports the canvas as a PNG cropped to its drawn pixels. Shared by the free
 * drawing pad and the cursive generator so both produce the same transparent
 * asset, regardless of the device pixel ratio.
 */
export function trimmedPngBlob(
  canvas: HTMLCanvasElement,
): Promise<Blob | null> {
  const context = canvas.getContext("2d");
  if (!context || canvas.width === 0 || canvas.height === 0) {
    return Promise.resolve(null);
  }
  const bounds = contentBounds(
    context.getImageData(0, 0, canvas.width, canvas.height).data,
    canvas.width,
    canvas.height,
  );
  if (!bounds) {
    return Promise.resolve(null);
  }
  const output = document.createElement("canvas");
  output.width = bounds.width;
  output.height = bounds.height;
  const outputContext = output.getContext("2d");
  if (!outputContext) {
    return Promise.resolve(null);
  }
  outputContext.drawImage(
    canvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height,
  );
  return new Promise((resolve) => output.toBlob(resolve, "image/png"));
}

interface SignaturePadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (file: File) => void;
  pending?: boolean;
}

/** Free-hand signature pad exporting a trimmed transparent PNG. */
export function SignaturePadModal({
  open,
  onClose,
  onSubmit,
  pending = false,
}: SignaturePadModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const drawn = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    drawn.current = false;
    setError(null);
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width) || FALLBACK_WIDTH;
    const height = Math.round(rect.height) || FALLBACK_HEIGHT;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    if (context) {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineWidth = STROKE_WIDTH;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = INK;
    }
  }, [open]);

  function pointAt(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startStroke(event: PointerEvent<HTMLCanvasElement>) {
    const point = pointAt(event);
    drawing.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is unavailable in some test environments.
    }
    const context = canvasRef.current?.getContext("2d");
    context?.beginPath();
    context?.moveTo(point.x, point.y);
  }

  function continueStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) {
      return;
    }
    const point = pointAt(event);
    const context = canvasRef.current?.getContext("2d");
    context?.lineTo(point.x, point.y);
    context?.stroke();
    drawn.current = true;
  }

  function endStroke(event: PointerEvent<HTMLCanvasElement>) {
    drawing.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture is unavailable in some test environments.
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    drawn.current = false;
    setError(null);
  }

  function confirm() {
    const canvas = canvasRef.current;
    if (!canvas || !drawn.current) {
      setError(t("settings.signatures.pad.blank"));
      return;
    }
    void trimmedPngBlob(canvas).then((blob) => {
      if (!blob) {
        setError(t("settings.signatures.pad.blank"));
        return;
      }
      setError(null);
      onSubmit(
        new File([blob], "signature-dessinee.png", { type: "image/png" }),
      );
    });
  }

  return (
    <FormModal
      open={open}
      title={t("settings.signatures.pad.title")}
      onClose={onClose}
      onSubmit={confirm}
      formDataCy="signature-pad-form"
      submitDataCy="btn-confirm-signature-pad"
      pending={pending}
      error={error}
    >
      <p className="signature-pad-modal-hint">
        {t("settings.signatures.pad.hint")}
      </p>
      <div className="signature-pad-modal-frame">
        <canvas
          ref={canvasRef}
          className="signature-pad-modal-canvas"
          aria-label={t("settings.signatures.pad.canvasLabel")}
          data-cy="signature-pad-canvas"
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
        />
      </div>
      <div className="signature-pad-modal-actions">
        <Button
          variant="secondary"
          small
          type="button"
          icon={<Eraser size={14} />}
          onClick={clear}
          data-cy="btn-clear-signature-pad"
        >
          {t("settings.signatures.pad.clear")}
        </Button>
        <span className="signature-pad-modal-note">
          <PenLine size={12} aria-hidden="true" />
          {t("settings.signatures.pad.note")}
        </span>
      </div>
    </FormModal>
  );
}

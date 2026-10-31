import "./SignatureFontGenerator.css";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormModal } from "@/components/ui/FormModal";
import { cn } from "@/lib/cn";
import { trimmedPngBlob } from "./SignaturePadModal";

const INK = "#1c252e";
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 300;
const BASELINE = 130;
const FONT_STYLESHEET_ID = "signature-studio-fonts";
const FONT_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat:wght@500&family=Dancing+Script:wght@700&display=swap";

const FALLBACK_FONT = 'italic 72px "Segoe Script", cursive';

export const SIGNATURE_FONTS = [
  { id: "caveat", family: "Caveat", font: "500 72px Caveat, cursive" },
  {
    id: "dancing-script",
    family: "Dancing Script",
    font: 'italic 700 72px "Dancing Script", cursive',
  },
  {
    id: "alex-brush",
    family: "Alex Brush",
    font: 'italic 400 72px "Alex Brush", cursive',
  },
] as const;

type SignatureFontId = (typeof SIGNATURE_FONTS)[number]["id"];

interface SignatureFontGeneratorProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (file: File, text: string) => void;
  pending?: boolean;
}

/** Locally generated cursive signature exported as a transparent PNG. */
export function SignatureFontGenerator({
  open,
  onClose,
  onSubmit,
  pending = false,
}: SignatureFontGeneratorProps) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [styleId, setStyleId] = useState<SignatureFontId>("caveat");
  const [error, setError] = useState<string | null>(null);

  // Same Google Fonts source as the app shell; a blocked network keeps the
  // local cursive stack instead of failing the export.
  useEffect(() => {
    if (document.getElementById(FONT_STYLESHEET_ID)) {
      return;
    }
    const link = document.createElement("link");
    link.id = FONT_STYLESHEET_ID;
    link.rel = "stylesheet";
    link.href = FONT_STYLESHEET_URL;
    document.head.appendChild(link);
  }, []);

  async function exportSignature() {
    const value = text.trim();
    if (!value) {
      setError(t("settings.signatures.font.textRequired"));
      return;
    }
    const style =
      SIGNATURE_FONTS.find((font) => font.id === styleId) ?? SIGNATURE_FONTS[0];
    let font: string = style.font;
    try {
      if (document.fonts) {
        await document.fonts.load(style.font);
        await document.fonts.ready;
      }
    } catch {
      // Offline or blocked font: the local cursive fallback still renders.
      font = FALLBACK_FONT;
    }

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) {
      setError(t("settings.signatures.font.exportFailed"));
      return;
    }
    context.font = font;
    context.fillStyle = INK;
    context.textBaseline = "middle";
    context.fillText(value, 24, BASELINE);

    const blob = await trimmedPngBlob(canvas);
    if (!blob) {
      setError(t("settings.signatures.font.exportFailed"));
      return;
    }
    setError(null);
    onSubmit(
      new File([blob], "signature-generee.png", { type: "image/png" }),
      value,
    );
  }

  return (
    <FormModal
      open={open}
      title={t("settings.signatures.font.title")}
      onClose={onClose}
      onSubmit={() => void exportSignature()}
      formDataCy="signature-font-form"
      submitDataCy="btn-export-signature-font"
      pending={pending}
      error={error}
    >
      <FieldGroup
        id="signature-font-text"
        label={t("settings.signatures.font.textLabel")}
        help={t("settings.signatures.font.textHelp")}
      >
        <input
          id="signature-font-text"
          className="field"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={255}
          placeholder={t("settings.signatures.font.textPlaceholder")}
          data-cy="input-signature-font-text"
        />
      </FieldGroup>

      <fieldset className="signature-font-generator-styles">
        <legend className="field-label">
          {t("settings.signatures.font.styleLabel")}
        </legend>
        <div className="signature-font-generator-grid">
          {SIGNATURE_FONTS.map((font) => (
            <label
              key={font.id}
              className={cn(
                "signature-font-generator-card",
                styleId === font.id && "signature-font-generator-card-active",
              )}
            >
              <input
                type="radio"
                name="signature-font-style"
                value={font.id}
                checked={styleId === font.id}
                onChange={() => setStyleId(font.id)}
                aria-label={font.family}
                className="signature-font-generator-radio"
              />
              <span className="signature-font-generator-name">
                {font.family}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "signature-font-generator-preview",
                  `signature-font-generator-preview-${font.id}`,
                )}
              >
                {text.trim() || t("settings.signatures.font.previewFallback")}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </FormModal>
  );
}

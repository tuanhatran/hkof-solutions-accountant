import "./TemplateImportForm.css";
import { Check, Eye, UploadCloud } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  FileDropzone,
  SelectedFile,
  TEMPLATE_FORMATS,
} from "@/components/forms/FileDropzone";
import { Button } from "@/components/ui/Button";
import type { TemplatesCardController } from "./useTemplatesCard";
import { MAX_TEMPLATE_SIZE } from "./templateTypes";
import { ValidationReport } from "./ValidationReport";

/** Import form for a new template version, with validation report. */
export function TemplateImportForm({ c }: { c: TemplatesCardController }) {
  const { t } = useTranslation();
  const { type, dataCy } = c.configuration;
  const lastImport = c.lastImport;
  return (
    <div className="template-import-form">
      <h3 className="template-import-form-title">
        <UploadCloud
          size={16}
          className="template-import-form-title-icon"
          aria-hidden="true"
        />
        {t("templates.import.title")}
      </h3>
      <p className="template-import-form-intro">
        {t("templates.import.intro")}
      </p>

      <div className="template-import-form-body">
        <div>
          <label className="field-label" htmlFor={`nom-template-${type}`}>
            {t("templates.import.nameLabel")}
          </label>
          <input
            id={`nom-template-${type}`}
            className="field"
            value={c.name}
            maxLength={120}
            placeholder={t("templates.import.namePlaceholder")}
            onChange={(event) => c.setName(event.target.value)}
            data-cy="input-template-name"
          />
        </div>

        {c.file ? (
          <SelectedFile
            name={c.file.name}
            size={c.file.size}
            mimeType={c.file.type}
            inProgress={c.upload.isPending}
            onRemove={() => c.setFile(null)}
          />
        ) : (
          <FileDropzone
            onFile={c.chooseFile}
            disabled={c.upload.isPending}
            dataCy={dataCy}
            accept={TEMPLATE_FORMATS}
            maxSize={MAX_TEMPLATE_SIZE}
            formatsDescription="HTML, HTM"
            text={t("templates.import.dropzoneText")}
            ariaLabel={t("templates.import.dropzoneAria")}
          />
        )}

        {c.uploadError ? (
          <p className="template-import-form-error" role="alert">
            {c.uploadError}
          </p>
        ) : null}

        <div className="template-import-form-actions">
          <Button
            variant="primary"
            icon={<UploadCloud size={15} />}
            loading={c.upload.isPending}
            disabled={!c.canUpload}
            onClick={() => {
              if (c.file && c.name.trim()) {
                c.upload.mutate({
                  templateName: c.name.trim(),
                  templateFile: c.file,
                });
              }
            }}
            data-cy="btn-upload-template"
          >
            {t("templates.import.submit")}
          </Button>
          <span className="template-import-form-actions-note">
            {t("templates.import.note")}
          </span>
        </div>

        {c.report ? <ValidationReport report={c.report} /> : null}

        {c.report && lastImport?.id ? (
          <div className="template-import-form-followup">
            <Button
              variant="secondary"
              small
              icon={<Eye size={14} />}
              loading={c.previewInProgress === lastImport.id}
              onClick={() => void c.openPreview(lastImport)}
            >
              {t("templates.versions.followupPreview", {
                version: lastImport.version,
              })}
            </Button>
            <Button
              variant="secondary"
              small
              icon={<Check size={14} />}
              loading={
                c.activate.isPending &&
                c.activate.variables?.id === lastImport.id
              }
              onClick={() => c.activate.mutate(lastImport)}
            >
              {t("templates.versions.followupActivate", {
                version: lastImport.version,
              })}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { Check, Eye, UploadCloud } from "lucide-react";
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
  const { type, dataCy } = c.configuration;
  const lastImport = c.lastImport;
  return (
    <div className="rounded-xl border border-line bg-paper/35 p-4">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <UploadCloud size={16} className="text-accent" aria-hidden="true" />
        Importer une nouvelle version
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        Fichier HTML UTF-8, 5 Mo maximum. Le nouveau modèle est validé puis
        importé sans être activé : vous pouvez d’abord l’aperçu avec des données
        d’exemple.
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <label className="field-label" htmlFor={`nom-template-${type}`}>
            Nom de la version
          </label>
          <input
            id={`nom-template-${type}`}
            className="field"
            value={c.name}
            maxLength={120}
            placeholder="Ex. Quittance — version 2027"
            onChange={(event) => c.setName(event.target.value)}
            data-cy="input-template-nom"
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
            text="Déposez votre template HTML"
            ariaLabel="Choisir un fichier template HTML"
          />
        )}

        {c.uploadError ? (
          <p
            className="rounded-lg border border-danger/20 bg-danger-soft/60 p-3 text-xs font-medium text-danger"
            role="alert"
          >
            {c.uploadError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
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
            data-cy="btn-televerser-template"
          >
            Valider et importer
          </Button>
          <span className="text-[11px] text-ink-soft">
            Une version importée doit être activée explicitement.
          </span>
        </div>

        {c.report ? <ValidationReport report={c.report} /> : null}

        {c.report && lastImport?.id ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              small
              icon={<Eye size={14} />}
              loading={c.previewInProgress === lastImport.id}
              onClick={() => void c.openPreview(lastImport)}
            >
              Aperçu de la version v{lastImport.version}
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
              Activer la version v{lastImport.version}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

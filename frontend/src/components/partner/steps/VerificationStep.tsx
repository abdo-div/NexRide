import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { FileText, ShieldCheck, Plus, Trash2, Upload } from "lucide-react";
import type { DocumentDraft, DocumentKind } from "../../../types/companyApplication";
import { DOCUMENT_KINDS } from "../../../lib/partnerApplicationView";
import { LabeledField, SelectInput, TextInput } from "./inputs";

interface Props {
  documents: DocumentDraft[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentDraft[]>>;
  errors: Record<string, string>;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const formatSize = (bytes: number): string => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const VerificationStep: React.FC<Props> = ({
  documents,
  setDocuments,
  errors,
}) => {
  const { t } = useTranslation();
  const fileRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const patch = (index: number, partial: Partial<DocumentDraft>) =>
    setDocuments((current) =>
      current.map((doc, i) => (i === index ? { ...doc, ...partial } : doc)),
    );

  const onPickFile = (index: number, file: File | null) => {
    if (!file) return;
    const current = documents[index];
    fileRefs.current.get(current.id)?.remove();
    setDocuments((prev) =>
      prev.map((doc, i) =>
        i === index
          ? {
              ...doc,
              file,
              name: doc.name.trim() ? doc.name : file.name,
              size: file.size,
            }
          : doc,
      ),
    );
  };

  const addDocument = () =>
    setDocuments((current) => [
      ...current,
      { id: uid(), name: "", kind: "COMMERCIAL_REGISTRY", file: null, size: 0 },
    ]);

  const removeDocument = (index: number) =>
    setDocuments((current) => current.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#0B1C30]">{t("partner.step4.title")}</h3>
          <p className="text-[13px] text-[#434655]">{t("partner.step4.subtitle")}</p>
        </div>
      </div>

      {documents.map((doc, index) => (
        <div key={doc.id} className="p-4 rounded-xl bg-[#EFF4FF] shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DCE9FF] flex items-center justify-center shrink-0 text-[#2563EB]">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              {doc.file ? (
                <span className="block text-sm font-bold text-[#0B1C30] truncate">
                  {doc.file.name}
                </span>
              ) : (
                <span className="block text-sm text-[#434655]">
                  {t("partner.step4.selectFile")}
                </span>
              )}
              <span className="text-[11px] text-[#737686]">
                {formatSize(doc.size)} · {t(`partner.step4.kinds.${doc.kind}`)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeDocument(index)}
              className="p-1.5 rounded-lg text-[#737686] hover:bg-[#E5EEFF] hover:text-[#BA1A1A] transition-colors cursor-pointer"
              aria-label={t("partner.step4.remove")}
            >
              <Trash2 className="w-[18px] h-[18px]" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3">
            <LabeledField
              label={t("partner.step4.documentLabel")}
              error={errors[`documents.${index}.name`]}
            >
              <TextInput
                value={doc.name}
                onChange={(name) => patch(index, { name })}
                placeholder="alsafwa_cr_cert.pdf"
              />
            </LabeledField>

            <LabeledField label={t("partner.step4.kindLabel")}>
              <SelectInput
                value={doc.kind}
                onChange={(kind) => patch(index, { kind: kind as DocumentKind })}
              >
                {DOCUMENT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`partner.step4.kinds.${kind}`)}
                  </option>
                ))}
              </SelectInput>
            </LabeledField>

            <div className="flex items-end">
              <input
                ref={(el) => {
                  if (el) fileRefs.current.set(doc.id, el);
                  else fileRefs.current.delete(doc.id);
                }}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => onPickFile(index, event.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRefs.current.get(doc.id)?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#004AC6] transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {t("partner.step4.selectFile")}
              </button>
            </div>
          </div>
        </div>
      ))}

      {errors.documents ? (
        <span className="text-[11px] font-semibold text-[#BA1A1A]">{errors.documents}</span>
      ) : null}

      <div>
        <button
          type="button"
          onClick={addDocument}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2563EB] hover:underline cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {t("partner.step4.add")}
        </button>
        <p className="text-[11px] text-[#737686] mt-2">{t("partner.step4.fileHint")}</p>
      </div>
    </div>
  );
};
import AppButton from "./AppButton";

export default function FormActions({
  onCancel,
  onSubmit,
  cancelLabel = "Batal",
  submitLabel = "Simpan",
  disabled = false,
}) {
  return (
    <div className="flex justify-end gap-2 mt-5">
      <AppButton type="ghost" onClick={onCancel} disabled={disabled}>
        {cancelLabel}
      </AppButton>
      <AppButton type="primary" onClick={onSubmit} disabled={disabled}>
        {submitLabel}
      </AppButton>
    </div>
  );
}

import type { ReactNode } from 'react';
import { Dialog } from '../../pluginHost/framework';

// 2026-08-29 (operator: "we need to have a Big Pop up so we can fill
// the fields that needs a space to fill") -- generic modal shell for
// editing a single cramped side-panel field with real room. The shared
// Dialog at its large size, since the side panel's own 560px width is not
// "bigger" for this purpose. Content is fully controlled by the caller
// (a draft value + onChange passed into whatever picker/textarea renders
// as `children`); this shell only owns the chrome + Save/Cancel actions,
// matching every other field in this codebase's own draft-then-commit
// convention.
interface FieldEditorModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  children: ReactNode;
}

export function FieldEditorModal({
  title,
  description,
  onClose,
  onSave,
  saving = false,
  saveDisabled = false,
  children,
}: FieldEditorModalProps) {
  return (
    <Dialog
      title={title}
      description={description}
      onClose={onClose}
      size="lg"
      testId="field-editor-modal"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || saveDisabled}
            onClick={onSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="field-editor-dialog-content">{children}</div>
    </Dialog>
  );
}

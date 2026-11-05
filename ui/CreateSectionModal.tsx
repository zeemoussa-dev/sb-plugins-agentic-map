import { useState } from 'react';
import { Dialog } from '../../pluginHost/framework';
import { Field } from '../../pluginHost/framework';
import { Notice } from '../../pluginHost/framework';
import { refusalText } from '../../pluginHost/framework';
import { createSection } from '../../pluginHost/framework';

export function CreateSectionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setFailure(null);
    try {
      await createSection(name.trim());
      onCreated();
    } catch (error) {
      setFailure(refusalText(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      title="New Section"
      description="A group of agents on the map."
      onClose={onClose}
      size="sm"
      // The testid the shared settings Modal gave this popup before it moved onto Dialog.
      testId="settings-modal"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" data-testid="section-save" disabled={saving || !name.trim()} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Create Section'}
          </button>
        </>
      }
    >
      <Field label="Name">
        <input className="input" data-testid="section-name" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      {failure && <Notice tone="error">{failure}</Notice>}
    </Dialog>
  );
}

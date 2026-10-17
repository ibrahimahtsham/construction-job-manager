import React, { useEffect, useState } from 'react';
import { CheckOutlined, CloseOutlined, EditOutlined, LoadingOutlined } from '@ant-design/icons';

export const efStyles = `
  .ef-view {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    min-height: 20px;
  }
  .ef-view > :first-child { flex: 1; min-width: 0; }
  .ef-icon-btn {
    background: none;
    border: none;
    padding: 2px 3px;
    cursor: pointer;
    line-height: 1;
    border-radius: 3px;
    display: flex;
    align-items: center;
    font-size: 13px;
    flex-shrink: 0;
    color: #6b7590;
    transition: color 0.15s;
    margin-top: 1px;
    outline: none;
  }
  .ef-icon-btn:hover:not(:disabled) { color: #bfc5d4; }
  .ef-icon-btn:disabled { cursor: default; opacity: 0.5; }
  .ef-save, .ef-cancel { color: #8a90a8; }
  .ef-save:hover:not(:disabled) { color: #3db87a; }
  .ef-cancel:hover:not(:disabled) { color: #e85555; }
  .ef-saved { color: #3db87a !important; }
  .ef-edit-mode { display: flex; flex-direction: column; gap: 4px; }
  .ef-action-row { display: flex; gap: 4px; }
  .ef-edit-mode .ant-input,
  .ef-edit-mode textarea.ant-input,
  .ef-edit-mode .ant-picker .ant-picker-input > input {
    font-family: 'IBM Plex Mono', monospace !important;
    font-size: 13px !important;
  }
`;

const normalize = (v) => (v == null ? '' : String(v).trim());

function EditableField({ value, renderDisplay, renderInput, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keep draft synced when server value changes while not editing
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const handleStart = () => {
    setDraft(value);
    setEditing(true);
    setSaved(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleSave = async () => {
    if (normalize(draft) === normalize(value)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 1200);
    } catch {
      // error toast is shown by the caller's onSave; stay in edit mode
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="ef-edit-mode">
        {renderInput(draft, setDraft)}
        <div className="ef-action-row">
          <button
            className="ef-icon-btn ef-save"
            onClick={handleSave}
            disabled={saving}
            title="Save"
          >
            {saving ? <LoadingOutlined /> : <CheckOutlined />}
          </button>
          <button
            className="ef-icon-btn ef-cancel"
            onClick={handleCancel}
            disabled={saving}
            title="Cancel"
          >
            <CloseOutlined />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ef-view">
      {renderDisplay(value)}
      <button
        className={`ef-icon-btn${saved ? ' ef-saved' : ''}`}
        onClick={saved ? undefined : handleStart}
        title={saved ? 'Saved' : 'Edit'}
        style={{ cursor: saved ? 'default' : 'pointer' }}
      >
        {saved ? <CheckOutlined /> : <EditOutlined />}
      </button>
    </div>
  );
}

export default EditableField;

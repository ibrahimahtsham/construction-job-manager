import React, { useState } from 'react';
import { Button, Form, Input, InputNumber, Switch, Modal, message, Spin, Tooltip } from 'antd';
import { EditOutlined, FilePdfOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client.js';

const pageStyles = `
  .tmpl-card { background: #141826; border: 1px solid #2e3550; border-radius: 6px; padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.15s; }
  .tmpl-card:hover { border-color: #3a4560; }
  .tmpl-edit-modal .ant-modal-content { background: #141826 !important; border: 1px solid #2e3550 !important; }
  .tmpl-edit-modal .ant-modal-header { background: #141826 !important; border-bottom: 1px solid #2e3550 !important; }
  .tmpl-edit-modal .ant-modal-title { font-family: 'Barlow Condensed', sans-serif !important; font-size: 16px !important; font-weight: 700 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; color: #f0ede8 !important; }
  .tmpl-edit-modal .ant-modal-footer { border-top: 1px solid #2e3550 !important; background: #141826 !important; }
  .tmpl-edit-modal .ant-form-item-label > label { font-family: 'Barlow Condensed', sans-serif !important; font-size: 11px !important; font-weight: 700 !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: #9aa0b4 !important; }
  .tmpl-edit-modal .ant-input, .tmpl-edit-modal .ant-input-textarea textarea, .tmpl-edit-modal .ant-input-number-input { background: #0f1320 !important; border-color: #2e3550 !important; color: #f0ede8 !important; font-family: 'IBM Plex Mono', monospace !important; font-size: 12px !important; }
  .tmpl-edit-modal .ant-input-number { background: #0f1320 !important; border-color: #2e3550 !important; }
  .tmpl-edit-modal .ant-switch { background: #2e3550 !important; }
  .tmpl-edit-modal .ant-switch-checked { background: #d4870a !important; }
`;

const CATEGORY_CONFIG = {
  'Customer Order':   { color: '#d4870a', label: 'CUSTOMER ORDER' },
  'Customer Invoice': { color: '#3db87a', label: 'CUSTOMER INVOICE' },
  'Vendor Order':     { color: '#7b8cde', label: 'VENDOR ORDER' },
  'Vendor Bill':      { color: '#e85555', label: 'VENDOR BILL' },
  'Bid Request':      { color: '#9aa0b4', label: 'BID REQUEST' },
};

const CUSTOMER_CATEGORIES = new Set(['Customer Order', 'Customer Invoice']);

function CategoryBadge({ category }) {
  const cfg = CATEGORY_CONFIG[category] || { color: '#4a5060', label: category };
  return (
    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 3, background: `${cfg.color}18`, border: `1px solid ${cfg.color}60`, color: cfg.color, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
      {cfg.label}
    </span>
  );
}

function TemplateCard({ tmpl, onEdit, onPreview, previewLoading }) {
  const isCustomer = CUSTOMER_CATEGORIES.has(tmpl.category);
  return (
    <div className="tmpl-card">
      {/* Type + category */}
      <div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', color: '#f0ede8', marginBottom: 5 }}>
          {tmpl.type}
        </div>
        <CategoryBadge category={tmpl.category} />
      </div>

      {/* Description */}
      {tmpl.description && (
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#6a7290', lineHeight: 1.5 }}>
          {tmpl.description}
        </div>
      )}

      {/* Defaults row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', borderTop: '1px solid #1e2436', paddingTop: 10 }}>
        <Stat label="Tax" value={`${Number(tmpl.default_tax_rate).toFixed(1)}%`} />
        <Stat label="Due" value={tmpl.default_due_days > 0 ? `${tmpl.default_due_days}d` : 'On receipt'} />
        {isCustomer && tmpl.default_hide_prices && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#4a5060' }}>
            <EyeInvisibleOutlined /> prices hidden
          </span>
        )}
        {tmpl.default_notes && (
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#4a5060' }}>has default notes</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => onEdit(tmpl)}
          style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.05em', fontSize: 11 }}
        >
          Edit Defaults
        </Button>
        <Button
          size="small"
          icon={<FilePdfOutlined />}
          loading={previewLoading}
          onClick={() => onPreview(tmpl)}
          style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.05em', fontSize: 11 }}
        >
          Preview PDF
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#4a5060', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#9aa0b4' }}>{value}</span>
    </div>
  );
}

export default function Documents() {
  const queryClient = useQueryClient();
  const [editTmpl, setEditTmpl]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [previewingId, setPreviewingId] = useState(null);
  const [form] = Form.useForm();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['document-templates'],
    queryFn: async () => {
      const { data } = await client.get('/document-templates');
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await client.patch(`/document-templates/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      message.success('Template updated');
      setEditTmpl(null);
    },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to save'),
  });

  const openEdit = (tmpl) => {
    setEditTmpl(tmpl);
    form.setFieldsValue({
      description:              tmpl.description || '',
      default_notes:            tmpl.default_notes || '',
      default_tax_rate:         Number(tmpl.default_tax_rate),
      default_due_days:         tmpl.default_due_days,
      default_hide_prices:      tmpl.default_hide_prices,
      default_hide_quantities:  tmpl.default_hide_quantities,
    });
  };

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      await updateMutation.mutateAsync({ id: editTmpl.id, payload: values });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async (tmpl) => {
    setPreviewingId(tmpl.id);
    try {
      const res = await client.get(`/document-templates/${tmpl.id}/preview-pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      message.error('Failed to generate preview PDF');
    } finally {
      setPreviewingId(null);
    }
  };

  // Group templates by category in display order
  const categoryOrder = ['Customer Order', 'Customer Invoice', 'Vendor Order', 'Vendor Bill', 'Bid Request'];
  const grouped = categoryOrder.reduce((acc, cat) => {
    const items = templates.filter(t => t.category === cat);
    if (items.length) acc.push({ category: cat, items });
    return acc;
  }, []);

  const isCustomerEdit = editTmpl && CUSTOMER_CATEGORIES.has(editTmpl.category);

  return (
    <>
      <style>{pageStyles}</style>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', color: '#f0ede8', textTransform: 'uppercase' }}>
          Document Templates
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4a5060', marginTop: 4 }}>
          Default settings and layout for each document type. Changes apply to new documents going forward.
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>
      ) : (
        grouped.map(({ category, items }) => {
          const cfg = CATEGORY_CONFIG[category] || {};
          return (
            <div key={category} style={{ marginBottom: 32 }}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: cfg.color || '#9aa0b4', textTransform: 'uppercase' }}>
                  {category}
                </div>
                <div style={{ flex: 1, height: 1, background: '#2e3550' }} />
              </div>

              {/* Cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {items.map(tmpl => (
                  <TemplateCard
                    key={tmpl.id}
                    tmpl={tmpl}
                    onEdit={openEdit}
                    onPreview={handlePreview}
                    previewLoading={previewingId === tmpl.id}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Edit modal */}
      <Modal
        className="tmpl-edit-modal"
        open={!!editTmpl}
        title={`EDIT TEMPLATE — ${editTmpl?.type || ''}`}
        onCancel={() => setEditTmpl(null)}
        onOk={handleSave}
        confirmLoading={saving}
        okText="Save"
        okButtonProps={{ style: { background: '#d4870a', borderColor: '#d4870a' } }}
        width={540}
        destroyOnHidden
      >
        {editTmpl && (
          <Form form={form} layout="vertical">
            <Form.Item name="description" label="Description" style={{ marginBottom: 14 }}>
              <Input.TextArea rows={2} placeholder="What this document type is used for..." />
            </Form.Item>

            <Form.Item name="default_notes" label="Default Notes" style={{ marginBottom: 14 }}>
              <Input.TextArea rows={3} placeholder="Pre-filled notes shown on every new document of this type..." />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <Form.Item name="default_tax_rate" label="Default Tax Rate %" style={{ marginBottom: 0 }}>
                <InputNumber min={0} max={100} step={0.1} style={{ width: '100%', background: '#0f1320', borderColor: '#2e3550' }} />
              </Form.Item>
              <Form.Item name="default_due_days" label="Default Due Days" style={{ marginBottom: 0 }}>
                <InputNumber min={0} max={365} style={{ width: '100%', background: '#0f1320', borderColor: '#2e3550' }} />
              </Form.Item>
            </div>

            {isCustomerEdit && (
              <div style={{ background: '#0f1320', border: '1px solid #2e3550', borderRadius: 4, padding: '12px 14px' }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#4a5060', marginBottom: 12, textTransform: 'uppercase' }}>
                  Customer View Defaults
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Form.Item name="default_hide_prices" label="Hide Individual Prices" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Switch />
                  </Form.Item>
                  <Form.Item name="default_hide_quantities" label="Hide Quantities" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Switch />
                  </Form.Item>
                </div>
              </div>
            )}
          </Form>
        )}
      </Modal>
    </>
  );
}

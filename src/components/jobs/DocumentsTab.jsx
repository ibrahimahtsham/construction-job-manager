import React, { useState, useMemo, useRef } from 'react';
import { Table, Button, Modal, Form, Input, Switch, Select, Popconfirm, Space, message, Tag, Steps, DatePicker, InputNumber } from 'antd';
import { PlusOutlined, EyeOutlined, LinkOutlined, FilePdfOutlined, DeleteOutlined, EditOutlined, DollarOutlined, SyncOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import client from '../../api/client.js';
import DocumentPreviewModal from './DocumentPreviewModal.jsx';

const docStyles = `
  .doc-table .ant-table { background: #141826 !important; color: #f0ede8 !important; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
  .doc-table .ant-table-thead > tr > th { background: #0f1320 !important; color: #9aa0b4 !important; font-family: 'Barlow Condensed', sans-serif !important; font-size: 11px !important; font-weight: 700 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; border-bottom: 1px solid #2e3550 !important; }
  .doc-table .ant-table-tbody > tr > td { background: #141826 !important; color: #f0ede8 !important; border-bottom: 1px solid #1e2436 !important; }
  .doc-table .ant-table-tbody > tr:hover > td { background: #1a2035 !important; }
  .doc-modal .ant-modal-content { background: #141826 !important; border: 1px solid #2e3550 !important; }
  .doc-modal .ant-modal-header { background: #141826 !important; border-bottom: 1px solid #2e3550 !important; }
  .doc-modal .ant-modal-title { font-family: 'Barlow Condensed', sans-serif !important; font-size: 16px !important; font-weight: 700 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; color: #f0ede8 !important; }
  .doc-modal .ant-modal-footer { border-top: 1px solid #2e3550 !important; background: #141826 !important; }
  .doc-modal .ant-form-item-label > label { font-family: 'Barlow Condensed', sans-serif !important; font-size: 11px !important; font-weight: 700 !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: #9aa0b4 !important; }
  .doc-modal .ant-input, .doc-modal .ant-input-textarea textarea { background: #0f1320 !important; border-color: #2e3550 !important; color: #f0ede8 !important; font-family: 'IBM Plex Mono', monospace !important; font-size: 12px !important; }
  .doc-modal .ant-picker { background: #0f1320 !important; border-color: #2e3550 !important; color: #f0ede8 !important; width: 100%; }
  .doc-modal .ant-picker input { color: #f0ede8 !important; font-family: 'IBM Plex Mono', monospace !important; font-size: 12px !important; }
  .doc-modal .ant-steps-item-title { color: #9aa0b4 !important; font-family: 'Barlow Condensed', sans-serif !important; font-size: 12px !important; letter-spacing: 0.08em !important; }
  .doc-modal .ant-steps-item-active .ant-steps-item-title { color: #d4870a !important; }
  .doc-modal .ant-steps-item-finish .ant-steps-item-title { color: #3db87a !important; }
  .doc-modal .ant-steps-item-active .ant-steps-icon { background: #d4870a !important; border-color: #d4870a !important; }
  .doc-type-btn { background: #1e2436; border: 1px solid #2e3550; border-radius: 5px; padding: 10px 14px; cursor: pointer; font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; color: #9aa0b4; text-align: center; transition: all 0.12s; }
  .doc-type-btn:hover { border-color: #d4870a; color: #d4870a; background: rgba(212,135,10,0.08); }
  .doc-type-btn.selected { border-color: #d4870a; color: #d4870a; background: rgba(212,135,10,0.15); }
  .doc-cat-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #4a5060; margin-bottom: 8px; margin-top: 14px; }
  .doc-cat-label:first-child { margin-top: 0; }
`;

const STATUS_COLORS = {
  draft:    { color: '#9aa0b4', bg: 'rgba(154,160,180,0.1)', border: '#2e3550' },
  pending:  { color: '#d4870a', bg: 'rgba(212,135,10,0.1)',  border: '#d4870a' },
  approved: { color: '#3db87a', bg: 'rgba(61,184,122,0.1)',  border: '#3db87a' },
  declined: { color: '#e85555', bg: 'rgba(232,85,85,0.1)',   border: '#e85555' },
  void:     { color: '#4a5060', bg: 'rgba(74,80,96,0.1)',    border: '#4a5060' },
};

const INVOICE_TYPES = ['Deposit', 'Invoice', 'Progress Invoice'];

const DOCUMENT_TYPES = {
  'Customer Order':   ['Proposal', 'Change Order', 'Contract - P/B', 'CONTRACT - Plumbing', 'CONTRACT - Roofing', 'CONTRACT - Slab', 'Customer Review'],
  'Customer Invoice': ['Deposit', 'Invoice', 'Progress Invoice'],
  'Vendor Order':     ['Purchase Order'],
  'Vendor Bill':      ['Bill', 'Expense', 'Refund'],
  'Bid Request':      ['Bid Request'],
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 3, background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

function buildTree(flat, parentId = null) {
  return flat
    .filter(e => (e.parent_id ?? null) === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(e => {
      const children = buildTree(flat, e.id);
      return children.length > 0 ? { ...e, children } : { ...e };
    });
}

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return `${(d.getUTCMonth() + 1).toString().padStart(2,'0')}/${d.getUTCDate().toString().padStart(2,'0')}/${d.getUTCFullYear()}`;
}

function formatDateTime(val) {
  if (!val) return null;
  const d = new Date(val);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function DocumentsTab({ jobId }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState([]);
  const [detailsForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [editForm] = Form.useForm();
  const [editEntryIds, setEditEntryIds] = useState([]);
  const [editing, setEditing] = useState(false);
  const [previewDocId, setPreviewDocId] = useState(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', jobId],
    queryFn: async () => { const { data } = await client.get(`/jobs/${jobId}/documents`); return data; },
  });

  const { data: budgetEntries = [] } = useQuery({
    queryKey: ['budget', jobId],
    queryFn: async () => { const { data } = await client.get(`/jobs/${jobId}/budget`); return data; },
  });

  const budgetTree = useMemo(() => buildTree(budgetEntries), [budgetEntries]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['documents', jobId] });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await client.delete(`/jobs/${jobId}/documents/${id}`); },
    onSuccess: () => { invalidate(); message.success('Document deleted'); },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to delete'),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (docId) => { const { data } = await client.post(`/jobs/${jobId}/documents/${docId}/mark-paid`); return data; },
    onSuccess: (data) => { invalidate(); message.success(data.paid_at ? 'Marked as paid' : 'Marked as unpaid'); },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to update payment status'),
  });

  const syncQBMutation = useMutation({
    mutationFn: async (docId) => { const { data } = await client.post(`/jobs/${jobId}/documents/${docId}/sync-qb`); return data; },
    onSuccess: () => { invalidate(); message.success('Synced to QuickBooks'); },
    onError: (err) => message.error(err.response?.data?.error || 'QB sync failed'),
  });

  const PROPOSAL_TYPES = ['Proposal', 'Contract - P/B', 'CONTRACT - Plumbing', 'CONTRACT - Roofing', 'CONTRACT - Slab'];
const DEFAULT_DUE_DAYS = {
  'Proposal': 30, 'Change Order': 30, 'Contract - P/B': 30, 'CONTRACT - Plumbing': 0,
  'CONTRACT - Roofing': 30, 'CONTRACT - Slab': 30, 'Customer Review': 7,
  'Deposit': 30, 'Invoice': 30, 'Progress Invoice': 30,
  'Purchase Order': 30, 'Bill': 30, 'Expense': 30, 'Refund': 0, 'Bid Request': 30,
};
const CUSTOMER_TYPES = new Set([
  'Proposal', 'Change Order', 'Contract - P/B', 'CONTRACT - Plumbing',
  'CONTRACT - Roofing', 'CONTRACT - Slab', 'Customer Review',
  'Deposit', 'Invoice', 'Progress Invoice',
]);

  const openCreate = () => { setCreateStep(0); setSelectedType(null); setSelectedEntryIds([]); detailsForm.resetFields(); setCreateOpen(true); };
  const closeCreate = () => setCreateOpen(false);

  const handleCreate = async () => {
    let details = {};
    try { details = await detailsForm.validateFields(); } catch { return; }
    setCreating(true);
    try {
      await client.post(`/jobs/${jobId}/documents`, {
        type: selectedType,
        line_item_ids: selectedEntryIds,
        title: details.title || null,
        notes: details.notes || null,
        expiry_date: details.expiry_date ? details.expiry_date.toISOString() : null,
        exclude_from_budget: details.exclude_from_budget || false,
        hide_prices: details.hide_prices || false,
        hide_quantities: details.hide_quantities || false,
        tax_rate: details.tax_rate != null ? Number(details.tax_rate) : undefined,
        due_days: details.due_days != null ? Number(details.due_days) : undefined,
      });
      invalidate();
      message.success('Document created');
      closeCreate();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  const copyPortalLink = async (docId) => {
    try {
      const { data } = await client.get(`/jobs/${jobId}/documents/${docId}/portal-link`);
      const url = data.portal_url;
      // navigator.clipboard requires HTTPS; fall back to execCommand on HTTP
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        message.success('Portal link copied to clipboard');
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) {
          message.success('Portal link copied to clipboard');
        } else {
          Modal.info({ title: 'Portal Link', content: <span style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: 12 }}>{url}</span>, okText: 'Close' });
        }
      }
    } catch {
      message.error('Failed to get portal link');
    }
  };

  const downloadPDF = async (docId, docType) => {
    try {
      const response = await client.get(`/jobs/${jobId}/documents/${docId}/pdf`, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      const cd = response.headers['content-disposition'];
      a.download = cd?.match(/filename="(.+)"/)?.[1] || `${(docType || 'document').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      message.error('Failed to generate PDF');
    }
  };

  const openEdit = async (record) => {
    setEditDoc(record);
    editForm.setFieldsValue({
      title: record.title || '',
      notes: record.notes || '',
      expiry_date: record.expiry_date ? dayjs(record.expiry_date) : null,
      exclude_from_budget: record.exclude_from_budget || false,
      hide_prices: record.hide_prices || false,
      hide_quantities: record.hide_quantities || false,
      tax_rate: record.tax_rate ?? null,
      due_days: record.due_days ?? null,
    });
    // Load current line items
    try {
      const { data } = await client.get(`/jobs/${jobId}/documents/${record.id}`);
      setEditEntryIds((data.line_items || []).map(li => li.budget_entry_id));
    } catch {
      setEditEntryIds([]);
    }
    setEditOpen(true);
  };

  const handleEdit = async () => {
    let values;
    try { values = await editForm.validateFields(); } catch { return; }
    setEditing(true);
    try {
      await client.put(`/jobs/${jobId}/documents/${editDoc.id}`, {
        title: values.title || null,
        notes: values.notes || null,
        expiry_date: values.expiry_date ? values.expiry_date.toISOString() : null,
        exclude_from_budget: values.exclude_from_budget || false,
        hide_prices: values.hide_prices || false,
        hide_quantities: values.hide_quantities || false,
        tax_rate: values.tax_rate != null ? Number(values.tax_rate) : undefined,
        due_days: values.due_days != null ? Number(values.due_days) : undefined,
        line_item_ids: editEntryIds,
      });
      invalidate();
      message.success('Document updated');
      setEditOpen(false);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to update document');
    } finally {
      setEditing(false);
    }
  };

  const previewDocument = (docId) => setPreviewDocId(docId);

  const handleLineItemSelect = (newKeys, isCreate) => {
    const oldKeys = isCreate ? selectedEntryIds : editEntryIds;
    const setter = isCreate ? setSelectedEntryIds : setEditEntryIds;
    const entryMap = new Map(budgetEntries.map(e => [e.id, e]));
    const oldSet = new Set(oldKeys);
    const newSet = new Set(newKeys);

    // When a group is deselected: also remove all its descendants
    for (const key of oldSet) {
      if (!newSet.has(key)) {
        const e = entryMap.get(key);
        if (e?.type === 'group') {
          for (const child of budgetEntries) {
            if (child.parent_id === key) {
              newSet.delete(child.id);
            }
          }
        }
      }
    }

    // When an item/entry is added: auto-include its parent group
    for (const key of newSet) {
      if (!oldSet.has(key)) {
        let e = entryMap.get(key);
        while (e?.parent_id) {
          newSet.add(e.parent_id);
          e = entryMap.get(e.parent_id);
        }
      }
    }

    setter([...newSet]);
  };

  // Step 0: type selector
  const typeSelector = (
    <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
      {Object.entries(DOCUMENT_TYPES).map(([cat, types]) => (
        <div key={cat}>
          <div className="doc-cat-label">{cat}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 4 }}>
            {types.map(t => (
              <div key={t} className={`doc-type-btn${selectedType === t ? ' selected' : ''}`} onClick={() => setSelectedType(t)}>
                {t}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // Step 1: line items
  const lineItemColumns = [
    {
      title: 'Line Item',
      dataIndex: 'name',
      render: (v, row) => (
        <span style={{ fontFamily: row.type === 'group' ? "'Barlow Condensed',sans-serif" : undefined, color: row.type === 'group' ? '#d4870a' : '#f0ede8', fontWeight: row.type === 'group' ? 700 : 400 }}>
          {v || <span style={{ color: '#4a5060' }}>(unnamed)</span>}
        </span>
      ),
    },
    { title: 'Type', dataIndex: 'type', width: 70, render: v => <span style={{ color: '#4a5060', fontSize: 11 }}>{v}</span> },
  ];

  const lineItemSelector = (
    <div>
      <p style={{ color: '#9aa0b4', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, marginBottom: 10 }}>
        Select the budget entries to include in this document.
      </p>
      <Table
        className="doc-table"
        size="small"
        columns={lineItemColumns}
        dataSource={budgetTree}
        rowKey="id"
        pagination={false}
        scroll={{ y: 300 }}
        rowSelection={{
          selectedRowKeys: selectedEntryIds,
          onChange: (keys) => handleLineItemSelect(keys, true),
          type: 'checkbox',
        }}
      />
    </div>
  );

  const isCustomerFacingType = selectedType && (
    DOCUMENT_TYPES['Customer Order']?.includes(selectedType) ||
    DOCUMENT_TYPES['Customer Invoice']?.includes(selectedType)
  );

  // Step 2: details
  const detailsFields = (
    <Form form={detailsForm} layout="vertical" style={{ marginTop: 12 }}>
      <Form.Item name="title" label="Document Title" style={{ marginBottom: 12 }}>
        <Input placeholder={`${selectedType || 'Document'} — optional custom title`} />
      </Form.Item>
      <Form.Item name="notes" label="Internal Notes" style={{ marginBottom: 12 }}>
        <Input.TextArea rows={2} placeholder="Notes visible to staff only..." />
      </Form.Item>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Form.Item name="expiry_date" label="Expiry Date" style={{ marginBottom: 0 }}>
          <DatePicker style={{ width: '100%' }} placeholder="No expiry" />
        </Form.Item>
        <Form.Item name="due_days" label="Due Days" style={{ marginBottom: 0 }} tooltip="Net payment terms (days)">
          <InputNumber min={0} max={365} style={{ width: '100%' }} placeholder="30" />
        </Form.Item>
        <Form.Item name="tax_rate" label="Tax Rate %" style={{ marginBottom: 0 }} tooltip="Sales tax percentage (e.g. 7.5 for 7.5%)">
          <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} placeholder="7.5" />
        </Form.Item>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Form.Item name="exclude_from_budget" label="Exclude from Budget" valuePropName="checked" style={{ marginBottom: 0 }}>
          <Switch />
        </Form.Item>
      </div>
      {isCustomerFacingType && (
        <div style={{ background: '#0f1320', border: '1px solid #2e3550', borderRadius: 4, padding: '12px 14px', marginTop: 4 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#4a5060', marginBottom: 10, textTransform: 'uppercase' }}>Customer View — Hide Columns</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="hide_prices" label="Hide Individual Prices" valuePropName="checked" style={{ marginBottom: 0 }}
              tooltip="Customer sees only the grand total, not individual line item prices">
              <Switch />
            </Form.Item>
            <Form.Item name="hide_quantities" label="Hide Quantities" valuePropName="checked" style={{ marginBottom: 0 }}
              tooltip="Hides the Qty and Unit columns from the customer view">
              <Switch />
            </Form.Item>
          </div>
        </div>
      )}
    </Form>
  );

  const steps = [
    { title: 'Type' },
    { title: 'Items' },
    { title: 'Details' },
  ];

  const stepContent = [typeSelector, lineItemSelector, detailsFields];

  const canNext = createStep === 0 ? !!selectedType : createStep === 1 ? selectedEntryIds.length > 0 : true;

  const createModalFooter = [
    <Button key="cancel" onClick={closeCreate}>Cancel</Button>,
    createStep > 0 && <Button key="back" onClick={() => setCreateStep(s => s - 1)}>Back</Button>,
    createStep < 2
      ? <Button key="next" type="primary" disabled={!canNext} onClick={() => {
          const nextStep = createStep + 1;
          if (nextStep === 2 && selectedType) {
            if (!detailsForm.getFieldValue('expiry_date') && PROPOSAL_TYPES.includes(selectedType)) {
              detailsForm.setFieldValue('expiry_date', dayjs().add(90, 'day'));
            }
            if (detailsForm.getFieldValue('due_days') == null) {
              detailsForm.setFieldValue('due_days', DEFAULT_DUE_DAYS[selectedType] ?? 30);
            }
            if (detailsForm.getFieldValue('tax_rate') == null) {
              detailsForm.setFieldValue('tax_rate', CUSTOMER_TYPES.has(selectedType) ? 7.5 : 0);
            }
            if (selectedType === 'Proposal' && detailsForm.getFieldValue('hide_prices') == null) {
              detailsForm.setFieldValue('hide_prices', true);
            }
          }
          setCreateStep(nextStep);
        }} style={{ background: '#d4870a', borderColor: '#d4870a' }}>Next</Button>
      : <Button key="create" type="primary" loading={creating} onClick={handleCreate} style={{ background: '#d4870a', borderColor: '#d4870a' }}>Create Document</Button>,
  ].filter(Boolean);

  const columns = [
    {
      title: 'Type',
      dataIndex: 'type',
      width: 180,
      render: (v) => <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13 }}>{v}</span>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      render: (v) => v || <span style={{ color: '#4a5060' }}>—</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (v, record) => (
        <div>
          <StatusBadge status={v} />
          {record.paid_at && (
            <div style={{ fontSize: 10, color: '#3db87a', fontFamily: "'IBM Plex Mono',monospace", marginTop: 2 }}>
              paid {formatDateTime(record.paid_at)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Items',
      dataIndex: 'line_item_count',
      width: 60,
      align: 'center',
      render: (v) => <span style={{ color: '#9aa0b4' }}>{v || 0}</span>,
    },
    {
      title: 'Expiry',
      dataIndex: 'expiry_date',
      width: 100,
      render: (v) => v ? <span style={{ color: new Date(v) < new Date() ? '#e85555' : '#9aa0b4' }}>{formatDate(v)}</span> : <span style={{ color: '#4a5060' }}>—</span>,
    },
    {
      title: 'Viewed',
      dataIndex: 'customer_viewed_at',
      width: 100,
      render: (v) => v
        ? <span style={{ color: '#9aa0b4', fontSize: 11 }}>{formatDateTime(v)}</span>
        : <span style={{ color: '#4a5060' }}>—</span>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      width: 100,
      render: (v) => <span style={{ color: '#4a5060', fontSize: 11 }}>{formatDate(v)}</span>,
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} title="Edit document" onClick={() => openEdit(record)} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }} />
          <Button size="small" icon={<EyeOutlined />} title="Preview portal view" onClick={() => previewDocument(record.id)} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }} />
          <Button size="small" icon={<LinkOutlined />} title="Copy portal link" onClick={() => copyPortalLink(record.id)} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }} />
          <Button size="small" icon={<FilePdfOutlined />} title="Download PDF" onClick={() => downloadPDF(record.id, record.type)} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }} />
          {INVOICE_TYPES.includes(record.type) && record.status === 'approved' && (
            <Button
              size="small"
              icon={<DollarOutlined />}
              title={record.paid_at ? 'Mark as unpaid' : 'Mark as paid'}
              loading={markPaidMutation.isPending && markPaidMutation.variables === record.id}
              onClick={() => markPaidMutation.mutate(record.id)}
              style={{ background: record.paid_at ? 'rgba(61,184,122,0.12)' : 'transparent', border: `1px solid ${record.paid_at ? '#3db87a' : '#2e3550'}`, color: record.paid_at ? '#3db87a' : '#9aa0b4' }}
            />
          )}
          {INVOICE_TYPES.includes(record.type) && (
            <Button
              size="small"
              icon={<SyncOutlined />}
              title={record.qb_invoice_id ? 'Re-sync to QuickBooks' : 'Sync to QuickBooks'}
              loading={syncQBMutation.isPending && syncQBMutation.variables === record.id}
              onClick={() => syncQBMutation.mutate(record.id)}
              style={{ background: record.qb_invoice_id ? 'rgba(61,184,122,0.08)' : 'transparent', border: `1px solid ${record.qb_invoice_id ? '#3db87a' : '#2e3550'}`, color: record.qb_invoice_id ? '#3db87a' : '#9aa0b4' }}
            />
          )}
          <Popconfirm title="Delete this document?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Button size="small" icon={<DeleteOutlined />} danger style={{ background: 'transparent', border: '1px solid #2e3550', color: '#4a5060' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <style>{docStyles}</style>
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button
            icon={<PlusOutlined />}
            onClick={openCreate}
            style={{ background: 'rgba(212,135,10,0.12)', border: '1px solid #d4870a', color: '#d4870a', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            New Document
          </Button>
        </div>

        <Table
          className="doc-table"
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 25, showSizeChanger: false }}
        />

        {/* Create wizard */}
        <Modal
          className="doc-modal"
          open={createOpen}
          title="NEW DOCUMENT"
          onCancel={closeCreate}
          footer={createModalFooter}
          width={640}
          destroyOnHidden
        >
          <Steps current={createStep} size="small" items={steps} style={{ marginBottom: 24, marginTop: 8 }} />
          {stepContent[createStep]}
        </Modal>

        {/* Edit document modal */}
        <Modal
          className="doc-modal"
          open={editOpen}
          title={`EDIT — ${editDoc?.type || 'DOCUMENT'}`}
          onCancel={() => setEditOpen(false)}
          onOk={handleEdit}
          confirmLoading={editing}
          okText="Save Changes"
          okButtonProps={{ style: { background: '#d4870a', borderColor: '#d4870a' } }}
          width={640}
          destroyOnHidden
        >
          <p style={{ color: '#4a5060', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, marginBottom: 10 }}>
            Select the budget entries to include in this document.
          </p>
          <Table
            className="doc-table"
            size="small"
            columns={lineItemColumns}
            dataSource={budgetTree}
            rowKey="id"
            pagination={false}
            scroll={{ y: 220 }}
            rowSelection={{ selectedRowKeys: editEntryIds, onChange: (keys) => handleLineItemSelect(keys, false), type: 'checkbox' }}
          />
          <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item name="title" label="Document Title" style={{ marginBottom: 12 }}>
              <Input placeholder={`${editDoc?.type || 'Document'} — optional custom title`} />
            </Form.Item>
            <Form.Item name="notes" label="Internal Notes" style={{ marginBottom: 12 }}>
              <Input.TextArea rows={2} placeholder="Notes visible to staff only..." />
            </Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Form.Item name="expiry_date" label="Expiry Date" style={{ marginBottom: 0 }}>
                <DatePicker style={{ width: '100%' }} placeholder="No expiry" />
              </Form.Item>
              <Form.Item name="due_days" label="Due Days" style={{ marginBottom: 0 }}>
                <InputNumber min={0} max={365} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="tax_rate" label="Tax Rate %" style={{ marginBottom: 0 }}>
                <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Form.Item name="exclude_from_budget" label="Exclude from Budget" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>
            </div>
            {editDoc && ['Customer Order','Customer Invoice'].includes(editDoc.category) && (
              <div style={{ background: '#0f1320', border: '1px solid #2e3550', borderRadius: 4, padding: '12px 14px' }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#4a5060', marginBottom: 10, textTransform: 'uppercase' }}>Customer View — Hide Columns</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Form.Item name="hide_prices" label="Hide Individual Prices" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Switch />
                  </Form.Item>
                  <Form.Item name="hide_quantities" label="Hide Quantities" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Switch />
                  </Form.Item>
                </div>
              </div>
            )}
          </Form>
        </Modal>

      </div>

      <DocumentPreviewModal
        jobId={jobId}
        docId={previewDocId}
        open={!!previewDocId}
        onClose={() => setPreviewDocId(null)}
      />
    </>
  );
}

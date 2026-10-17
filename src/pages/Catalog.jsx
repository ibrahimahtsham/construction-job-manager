import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Tabs, Table, Button, Modal, Form, Input, InputNumber,
  Popconfirm, Space, Select, message, Tooltip, Spin, Upload, Progress,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, RobotOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const r2 = (n) => Math.round(n * 100) / 100;
const fmt$ = (v) => (v == null ? '—' : `$${Number(v).toFixed(2)}`);
const fmtPct = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false, i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      else if (ch === '"') inQ = false;
      else field += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch !== '\r') field += ch;
    }
    i++;
  }
  if (row.length || field) { row.push(field); rows.push(row); }
  return rows;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageStyles = `
  .catalog-page { padding: 32px 32px 48px 32px; min-height: 100%; background: #141826; color: #f0ede8; }
  .catalog-page-title { font-family: 'Barlow Condensed', sans-serif; font-size: 28px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #f0ede8; margin-bottom: 24px; line-height: 1; }
  .catalog-page-title span { color: #d4870a; }
  .catalog-tabs .ant-tabs-tab { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #9aa0b4 !important; }
  .catalog-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #d4870a !important; }
  .catalog-tabs .ant-tabs-ink-bar { background: #d4870a !important; }
  .catalog-table .ant-table { background: #141826 !important; color: #f0ede8 !important; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
  .catalog-table .ant-table-thead > tr > th { background: #0f1320 !important; color: #9aa0b4 !important; font-family: 'Barlow Condensed', sans-serif !important; font-size: 11px !important; font-weight: 700 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; border-bottom: 1px solid #2e3550 !important; }
  .catalog-table .ant-table-tbody > tr > td { background: #141826 !important; color: #f0ede8 !important; border-bottom: 1px solid #1e2436 !important; }
  .catalog-table .ant-table-tbody > tr:hover > td { background: #1a2035 !important; }
  .catalog-table .ant-table-row-expand-icon-cell { background: #141826 !important; }
  .catalog-table .ant-table-row-level-1 > td { background: #111724 !important; }
  .catalog-table .ant-table-row-level-1:hover > td { background: #161e30 !important; }
  .catalog-table .ant-checkbox-inner { background: #0f1320 !important; border-color: #2e3550 !important; }
  .catalog-table .ant-checkbox-checked .ant-checkbox-inner { background: #d4870a !important; border-color: #d4870a !important; }
  .catalog-table .ant-checkbox-wrapper:hover .ant-checkbox-inner, .catalog-table .ant-checkbox:hover .ant-checkbox-inner { border-color: #d4870a !important; }
  .catalog-action-btn { background: rgba(212, 135, 10, 0.12) !important; border: 1px solid #d4870a !important; border-radius: 4px !important; color: #d4870a !important; font-family: 'Barlow Condensed', sans-serif !important; font-size: 13px !important; font-weight: 700 !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; }
  .catalog-action-btn:hover { background: rgba(212, 135, 10, 0.24) !important; color: #d4870a !important; }
  .catalog-modal .ant-modal-content { background: #141826 !important; border: 1px solid #2e3550 !important; }
  .catalog-modal .ant-modal-header { background: #141826 !important; border-bottom: 1px solid #2e3550 !important; }
  .catalog-modal .ant-modal-title { font-family: 'Barlow Condensed', sans-serif !important; font-size: 16px !important; font-weight: 700 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; color: #f0ede8 !important; }
  .catalog-modal .ant-modal-footer { border-top: 1px solid #2e3550 !important; background: #141826 !important; }
  .catalog-modal .ant-form-item-label > label { font-family: 'Barlow Condensed', sans-serif !important; font-size: 12px !important; font-weight: 600 !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: #9aa0b4 !important; }
  .catalog-modal .ant-input, .catalog-modal .ant-input-number, .catalog-modal .ant-input-number-input { background: #0f1320 !important; border-color: #2e3550 !important; color: #f0ede8 !important; font-family: 'IBM Plex Mono', monospace !important; font-size: 12px !important; }
  .catalog-modal .ant-input:focus, .catalog-modal .ant-input-number-focused { border-color: #d4870a !important; box-shadow: 0 0 0 2px rgba(212, 135, 10, 0.2) !important; }
  .catalog-modal textarea.ant-input { resize: vertical; }
  .catalog-section-title { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #9aa0b4; }
  .catalog-ro-field { background: #080d18 !important; border-color: #1a2236 !important; color: #6a7290 !important; cursor: default !important; }
  .catalog-ro-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #4a5060; display: block; margin-bottom: 4px; }

  /* Group editor table */
  .cg-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', monospace; font-size: 11px; margin-top: 12px; }
  .cg-table th { background: #080d18; color: #6a7290; font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 5px 8px; text-align: left; border-bottom: 1px solid #1a2236; border-right: 1px solid #1a2236; }
  .cg-table th:last-child { border-right: none; }
  .cg-table th.r { text-align: right; }
  .cg-table td { padding: 3px 8px; border-bottom: 1px solid #141e2e; border-right: 1px solid #141e2e; vertical-align: middle; }
  .cg-table td:last-child { border-right: none; }
  .cg-table td.r { text-align: right; }
  .cg-row-item td { background: #0f1320; color: #f0ede8; }
  .cg-row-item:hover td { background: #141826; }

  .cg-cell-edit { background: #0d1122; border: 1px solid #d4870a; border-radius: 3px; color: #f0ede8; font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 2px 6px; outline: none; box-sizing: border-box; }
  .cg-cell-edit:focus { box-shadow: 0 0 0 2px rgba(212,135,10,0.2); }
  .cg-add-row td { background: #0a0f1a; padding: 6px 8px; }
  .cg-bib { background: none; border: none; color: #3a4260; cursor: pointer; padding: 2px 4px; border-radius: 3px; font-size: 12px; transition: color 0.1s; line-height: 1; }
  .cg-bib:hover { color: #d4870a; }
  .cg-bib.del:hover { color: #e85555; }
  .cg-add-btn { background: rgba(212,135,10,0.08); border: 1px solid rgba(212,135,10,0.25); border-radius: 3px; color: #d4870a; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 8px; cursor: pointer; margin-right: 6px; }
  .cg-add-btn:hover { background: rgba(212,135,10,0.18); }
  .cg-inline-add td { background: #0a0f1a; padding: 4px 8px; }
`;

// ─── ItemsTab ─────────────────────────────────────────────────────────────────

function ItemsTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [localMargin, setLocalMargin] = useState(40);
  // 'unit_cost' | 'unit_price' — which field was last edited, used as anchor for margin changes
  const [marginAnchor, setMarginAnchor] = useState('unit_cost');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importItems, setImportItems] = useState([]);
  const [importing, setImporting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [aiPricingId, setAiPricingId] = useState(null);
  const [batchProgress, setBatchProgress] = useState(null); // null | { done, total, stopped }
  const batchStopRef = useRef(false);

  // Watch unit_cost and unit_price for live formula display
  const watchedCost = Form.useWatch('unit_cost', form);
  const watchedPrice = Form.useWatch('unit_price', form);
  const computedProfit = watchedCost != null && watchedPrice != null ? r2(watchedPrice - watchedCost) : null;
  const computedMargin = computedProfit != null && watchedPrice != null && watchedPrice !== 0
    ? r2((computedProfit / watchedPrice) * 100) : null;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['catalog-items'],
    queryFn: async () => { const { data } = await client.get('/catalog/items'); return data; },
  });

  const filteredItems = searchText.trim()
    ? items.filter(item => {
        const q = searchText.toLowerCase();
        return item.name?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
      })
    : items;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['catalog-items'] });

  const createMutation = useMutation({
    mutationFn: async (values) => { const { data } = await client.post('/catalog/items', values); return data; },
    onSuccess: () => { invalidate(); closeModal(); message.success('Item created'); },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to create item'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }) => { const { data } = await client.put(`/catalog/items/${id}`, values); return data; },
    onSuccess: () => { invalidate(); closeModal(); message.success('Item updated'); },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to update item'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await client.delete(`/catalog/items/${id}`); },
    onSuccess: () => { invalidate(); message.success('Item deleted'); },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to delete item'),
  });

  const openNew = () => {
    setEditingItem(null);
    form.resetFields();
    setLocalMargin(40);
    setMarginAnchor('unit_cost');
    setModalOpen(true);
  };
  const openEdit = (item) => {
    setEditingItem(item);
    const uc = item.unit_cost != null ? Number(item.unit_cost) : null;
    const up = item.unit_price != null ? Number(item.unit_price) : null;
    form.setFieldsValue({ name: item.name, description: item.description, unit: item.unit, unit_cost: uc, unit_price: up });
    const m = (uc != null && up != null && up !== 0) ? r2(((up - uc) / up) * 100) : null;
    setLocalMargin(m);
    setMarginAnchor('unit_cost');
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingItem(null); form.resetFields(); setLocalMargin(40); setMarginAnchor('unit_cost'); };

  const handleCostChange = (uc) => {
    setMarginAnchor('unit_cost');
    const m = localMargin;
    if (uc != null && m != null && m < 100) {
      form.setFieldValue('unit_price', r2(uc / (1 - m / 100)));
    }
  };

  const handlePriceChange = (up) => {
    setMarginAnchor('unit_price');
    const m = localMargin;
    if (up != null && m != null && m < 100) {
      form.setFieldValue('unit_cost', r2(up * (1 - m / 100)));
    }
  };

  const handleMarginChange = (m) => {
    setLocalMargin(m);
    if (m == null || m >= 100) return;
    if (marginAnchor === 'unit_cost') {
      const uc = form.getFieldValue('unit_cost');
      if (uc != null) form.setFieldValue('unit_price', r2(uc / (1 - m / 100)));
    } else {
      const up = form.getFieldValue('unit_price');
      if (up != null) form.setFieldValue('unit_cost', r2(up * (1 - m / 100)));
    }
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingItem) updateMutation.mutate({ id: editingItem.id, values });
      else createMutation.mutate(values);
    });
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCSV(e.target.result);
      if (rows.length < 2) { message.error('CSV appears empty'); return; }
      const parsed = rows.slice(1)
        .map(c => ({
          name: (c[0] || '').trim(),
          description: (c[22] || '').trim() || null,
        }))
        .filter(item => item.name.length > 0);
      setImportItems(parsed);
      setImportOpen(true);
    };
    reader.readAsText(file);
    return false; // prevent antd auto-upload
  };

  const handleImportAll = async () => {
    setImporting(true);
    try {
      const { data } = await client.post('/catalog/items/batch', { items: importItems });
      queryClient.invalidateQueries({ queryKey: ['catalog-items'] });
      const parts = [`${data.created_count} items imported`];
      if (data.skipped > 0) parts.push(`${data.skipped} already existed`);
      message.success(parts.join(', '));
      setImportItems([]);
      setImportOpen(false);
    } catch (err) {
      message.error(err.response?.data?.error || 'Import failed');
    } finally { setImporting(false); }
  };

  // 40% margin: unit_price = unit_cost / (1 - 0.40) = unit_cost / 0.60
  const applyMargin = (unit_cost) => Math.round(unit_cost / 0.60 * 100) / 100;

  const handleAiPriceItem = async (item) => {
    if (aiPricingId) return;
    setAiPricingId(item.id);
    try {
      const { data } = await client.post('/catalog/ai-price', { name: item.name, description: item.description || '' });
      const unit_price = applyMargin(data.unit_cost);
      await client.put(`/catalog/items/${item.id}`, { unit_cost: data.unit_cost, unit_price, unit: data.unit || item.unit || null });
      invalidate();
      message.success(`"${item.name}" — cost $${data.unit_cost} / price $${unit_price}${data.reasoning ? ` (${data.reasoning})` : ''}`);
    } catch (err) {
      message.error(err.response?.data?.error || 'AI price suggestion failed');
    } finally {
      setAiPricingId(null);
    }
  };

  const handleBatchAiPrice = async () => {
    const blank = items.filter(it => !it.unit_cost && it.name?.trim());
    if (blank.length === 0) { message.info('No unpriced items found'); return; }

    batchStopRef.current = false;
    setBatchProgress({ done: 0, total: blank.length, stopped: false });

    const CHUNK = 20;
    let done = 0;

    try {
      for (let i = 0; i < blank.length; i += CHUNK) {
        if (batchStopRef.current) break;

        const chunk = blank.slice(i, i + CHUNK);
        const { data } = await client.post('/catalog/ai-price/batch', {
          items: chunk.map(it => ({ id: it.id, name: it.name, description: it.description || '' })),
        });

        // Apply results
        await Promise.all(
          (data.results || [])
            .filter(r => r.unit_cost && !r.error)
            .map(r => {
              const unit_price = applyMargin(r.unit_cost);
              return client.put(`/catalog/items/${r.id}`, { unit_cost: r.unit_cost, unit_price, unit: r.unit || null });
            })
        );

        done += chunk.length;
        setBatchProgress(p => ({ ...p, done }));
      }

      invalidate();
      const stopped = batchStopRef.current;
      setBatchProgress(p => ({ ...p, stopped, done }));
      message.success(stopped ? `Stopped — ${done} of ${blank.length} items priced` : `${done} items priced at 40% margin`);
    } catch (err) {
      message.error(err.response?.data?.error || 'Batch pricing failed');
      setBatchProgress(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => client.delete(`/catalog/items/${id}`)));
      queryClient.invalidateQueries({ queryKey: ['catalog-items'] });
      message.success(`${selectedRowKeys.length} item${selectedRowKeys.length > 1 ? 's' : ''} deleted`);
      setSelectedRowKeys([]);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to delete items');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Description', dataIndex: 'description', render: (v) => v || <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'Unit', dataIndex: 'unit', width: 80, render: (v) => v || <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'Unit Cost', dataIndex: 'unit_cost', width: 110, align: 'right', render: fmt$ },
    { title: 'Unit Price', dataIndex: 'unit_price', width: 110, align: 'right', render: fmt$ },
    {
      title: '', key: 'actions', width: 130, align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="AI price suggestion" mouseEnterDelay={0.5}>
            <Button
              size="small"
              icon={<RobotOutlined spin={aiPricingId === record.id} />}
              loading={aiPricingId === record.id}
              disabled={!!aiPricingId}
              onClick={() => handleAiPriceItem(record)}
              style={{ background: 'transparent', border: '1px solid #2e3550', color: '#6a7290' }}
            />
          </Tooltip>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }} />
          <Popconfirm title="Delete this item?" description="This cannot be undone." onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Button size="small" icon={<DeleteOutlined />} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#4a5060' }} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const lPos = computedProfit != null ? computedProfit >= 0 : null;

  return (
    <div>
      {batchProgress && (
        <div style={{ background: '#0f1320', border: '1px solid #2e3550', borderRadius: 4, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: '#9aa0b4' }}>
              <RobotOutlined style={{ marginRight: 6, color: '#d4870a' }} />
              {batchProgress.done < batchProgress.total && !batchProgress.stopped
                ? `Pricing items… ${batchProgress.done} / ${batchProgress.total} (may take ~1 min)`
                : `Done — ${batchProgress.done} of ${batchProgress.total} items priced`}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {batchProgress.done < batchProgress.total && !batchProgress.stopped && (
                <Button size="small" danger onClick={() => { batchStopRef.current = true; }}>Stop</Button>
              )}
              {(batchProgress.done >= batchProgress.total || batchProgress.stopped) && (
                <Button size="small" onClick={() => setBatchProgress(null)}>Dismiss</Button>
              )}
            </div>
          </div>
          <Progress
            percent={Math.round(batchProgress.done / batchProgress.total * 100)}
            strokeColor="#d4870a"
            trailColor="#1e2436"
            showInfo={false}
            size="small"
          />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 16 }}>
        <Input
          placeholder="Search items..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          allowClear
          style={{ maxWidth: 280, background: '#0f1320', borderColor: '#2e3550', color: '#f0ede8', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`Delete ${selectedRowKeys.length} item${selectedRowKeys.length > 1 ? 's' : ''}?`}
              description="This cannot be undone."
              onConfirm={handleBulkDelete}
              okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}
            >
              <Button danger>Delete {selectedRowKeys.length} selected</Button>
            </Popconfirm>
          )}
          <Tooltip title={`Price all items with no cost set (40% margin)`} mouseEnterDelay={0.4}>
            <Button
              icon={<RobotOutlined />}
              className="catalog-action-btn"
              loading={batchProgress !== null && batchProgress.done < batchProgress.total}
              disabled={batchProgress !== null && batchProgress.done < batchProgress.total}
              onClick={handleBatchAiPrice}
            >
              Price All Blank
            </Button>
          </Tooltip>
          <Upload accept=".csv" showUploadList={false} beforeUpload={handleFileUpload}>
            <Button icon={<UploadOutlined />} className="catalog-action-btn">Import CSV</Button>
          </Upload>
          <Button className="catalog-action-btn" icon={<PlusOutlined />} onClick={openNew}>New Item</Button>
        </div>
      </div>
      <Table
        className="catalog-table"
        columns={columns}
        dataSource={filteredItems}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['25', '50', '100', '1000'],
          onShowSizeChange: (_, size) => setPageSize(size),
        }}
        size="small"
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          type: 'checkbox',
          // Override header checkbox to select/deselect ALL items across all pages
          onSelectAll: (selected) => {
            setSelectedRowKeys(selected ? filteredItems.map(item => item.id) : []);
          },
          selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
        }}
      />

      <Modal
        className="catalog-modal"
        open={importOpen}
        title={`IMPORT ${importItems.length} ITEMS FROM CSV`}
        onCancel={() => { setImportOpen(false); setImportItems([]); }}
        footer={[
          <Button key="cancel" onClick={() => { setImportOpen(false); setImportItems([]); }}>Cancel</Button>,
          <Button key="import" type="primary" loading={importing} onClick={handleImportAll}
            style={{ background: '#d4870a', borderColor: '#d4870a' }}>Import All</Button>,
        ]}
        width={720}
        destroyOnHidden
      >
        <p style={{ color: '#9aa0b4', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, marginBottom: 12 }}>
          {importItems.length} items found:
        </p>
        <Table
          className="catalog-table"
          size="small"
          pagination={false}
          scroll={{ y: 400 }}
          dataSource={importItems.map((item, i) => ({ ...item, key: i }))}
          columns={[
            { title: 'Name', dataIndex: 'name', ellipsis: true },
            { title: 'Description', dataIndex: 'description', ellipsis: true,
              render: v => v || <span style={{ color: '#4a5060' }}>—</span> },
          ]}
        />
      </Modal>

      <Modal className="catalog-modal" open={modalOpen} title={editingItem ? 'EDIT ITEM' : 'NEW ITEM'} onCancel={closeModal} onOk={handleSubmit} confirmLoading={createMutation.isPending || updateMutation.isPending} okText={editingItem ? 'Save' : 'Create'} width={600} destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="Item name" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
          <Form.Item name="unit" label="Unit">
            <Input placeholder="e.g. ea, hr, sqft" />
          </Form.Item>

          {/* Formula columns — bidirectional: cost↔price via margin */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, alignItems: 'end' }}>
            <Form.Item name="unit_cost" label="Unit Cost" style={{ marginBottom: 0 }}>
              <InputNumber prefix="$" precision={2} min={0} style={{ width: '100%' }} placeholder="0.00" onChange={handleCostChange} />
            </Form.Item>

            <Form.Item name="unit_price" label="Unit Price / Sell" style={{ marginBottom: 0 }}>
              <InputNumber prefix="$" precision={2} min={0} style={{ width: '100%' }} placeholder="0.00" onChange={handlePriceChange} />
            </Form.Item>

            <div>
              <Tooltip title="Unit Price − Unit Cost" mouseEnterDelay={0.3}>
                <span className="catalog-ro-label" style={{ cursor: 'help', borderBottom: '1px dashed #3a4260' }}>Profit ℹ</span>
              </Tooltip>
              <InputNumber
                prefix="$"
                precision={2}
                value={computedProfit}
                disabled
                className="catalog-ro-field"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <Tooltip title="Editing margin back-calculates Unit Price" mouseEnterDelay={0.3}>
                <span className="catalog-ro-label" style={{ cursor: 'help', color: '#9aa0b4', borderBottom: '1px dashed #4a5060' }}>Margin ℹ</span>
              </Tooltip>
              <InputNumber
                value={localMargin ?? computedMargin}
                onChange={handleMarginChange}
                formatter={(v) => (v != null ? `${v}%` : '')}
                parser={(v) => v?.replace('%', '')}
                precision={1}
                min={0}
                max={99.9}
                style={{ width: '100%', background: '#0f1320', borderColor: '#2e3550', color: '#f0ede8' }}
                placeholder="0%"
              />
            </div>
          </div>
          {computedProfit != null && (
            <div style={{ marginTop: 8, display: 'flex', gap: 16, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>
              <span style={{ color: '#4a5060' }}>Profit:</span>
              <span style={{ color: lPos === true ? '#3db87a' : lPos === false ? '#e85555' : '#9aa0b4' }}>{fmt$(computedProfit)}</span>
              <span style={{ color: '#4a5060', marginLeft: 8 }}>Margin:</span>
              <span style={{ color: lPos === true ? '#3db87a' : lPos === false ? '#e85555' : '#9aa0b4' }}>{fmtPct(computedMargin)}</span>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
}

// ─── GroupEditorModal ─────────────────────────────────────────────────────────

function GroupEditorModal({ open, group, onClose }) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localEntries, setLocalEntries] = useState([]); // items only — no sub-groups
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemId, setAddItemId] = useState(null);
  const [addItemQty, setAddItemQty] = useState(1);
  const originalRef = useRef(null);

  const isNew = !group?.id;
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['catalog-groups'] });
    queryClient.invalidateQueries({ queryKey: ['catalog-items'] });
  };

  const { data: allItems = [] } = useQuery({
    queryKey: ['catalog-items'],
    queryFn: async () => { const { data } = await client.get('/catalog/items'); return data; },
    enabled: open,
  });

  // Reset on close; fetch fresh items on open
  useEffect(() => {
    if (!open) {
      form.resetFields();
      setLocalEntries([]);
      setAddItemOpen(false); setAddItemId(null); setAddItemQty(1);
      originalRef.current = null;
      return;
    }
    form.setFieldsValue({ name: group?.name ?? '', description: group?.description ?? '' });
    if (!group?.id) { setLocalEntries([]); originalRef.current = null; return; }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data: items } = await client.get(`/catalog/groups/${group.id}/items`);
        if (cancelled) return;
        const entries = items.map(i => ({
          id: i.id, item_id: i.item_id, name: i.name,
          unit: i.unit, unit_cost: i.unit_cost, unit_price: i.unit_price,
          qty: Number(i.quantity) || 1,
        }));
        setLocalEntries(entries);
        originalRef.current = entries.map(e => ({ ...e }));
      } catch { message.error('Failed to load group items'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [open, group?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const usedItemIds = useMemo(() => new Set(localEntries.map(e => e.item_id)), [localEntries]);
  const availableItems = allItems.filter(ci => !usedItemIds.has(ci.id));

  const addItem = () => {
    if (!addItemId) return;
    const ci = allItems.find(x => x.id === addItemId);
    if (!ci) return;
    setLocalEntries(prev => [...prev, {
      id: `tmp-${Date.now()}`, item_id: ci.id, name: ci.name,
      unit: ci.unit, unit_cost: ci.unit_cost, unit_price: ci.unit_price, qty: addItemQty || 1,
    }]);
    setAddItemOpen(false); setAddItemId(null); setAddItemQty(1);
  };

  const removeEntry = (id) => setLocalEntries(prev => prev.filter(e => e.id !== id));
  const updateQty = (id, qty) => setLocalEntries(prev => prev.map(e => e.id === id ? { ...e, qty } : e));

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      if (isNew) {
        const { data: newGroup } = await client.post('/catalog/groups', {
          name: values.name.trim(), description: values.description || null,
        });
        for (const e of localEntries) {
          await client.post(`/catalog/groups/${newGroup.id}/items`, { item_id: e.item_id, quantity: e.qty });
        }
      } else {
        await client.put(`/catalog/groups/${group.id}`, {
          name: values.name.trim(), description: values.description || null,
        });
        const orig = originalRef.current || [];
        const origMap = new Map(orig.map(e => [e.item_id, e]));
        const currMap = new Map(localEntries.map(e => [e.item_id, e]));
        for (const [item_id] of origMap) {
          if (!currMap.has(item_id)) await client.delete(`/catalog/groups/${group.id}/items/${item_id}`);
        }
        for (const [item_id, e] of currMap) {
          if (!origMap.has(item_id)) {
            await client.post(`/catalog/groups/${group.id}/items`, { item_id, quantity: e.qty });
          } else if (Number(origMap.get(item_id).qty) !== Number(e.qty)) {
            await client.put(`/catalog/groups/${group.id}/items/${item_id}`, { quantity: e.qty });
          }
        }
      }
      invalidateAll();
      message.success(isNew ? 'Group created' : 'Group updated');
      onClose();
    } catch (err) {
      if (err?.response) message.error(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <Modal
      className="catalog-modal"
      open={open}
      title={isNew ? 'NEW GROUP' : 'EDIT GROUP'}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={saving}
      okText={isNew ? 'Create' : 'Save'}
      width={680}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="name" label="Group Name" rules={[{ required: true, message: 'Name is required' }]} style={{ marginBottom: 8 }}>
            <Input placeholder="Group name" />
          </Form.Item>
          <Form.Item name="description" label="Description" style={{ marginBottom: 8 }}>
            <Input placeholder="Optional description" />
          </Form.Item>
        </div>
      </Form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}><Spin /></div>
      ) : (
        <>
          <table className="cg-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th className="r" style={{ width: 90 }}>Cost/Unit</th>
                <th className="r" style={{ width: 90 }}>Price/Unit</th>
                <th className="r" style={{ width: 72 }}>Qty</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {localEntries.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#3a4260', padding: '20px 0', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, letterSpacing: '0.06em' }}>
                  No items yet — add items below
                </td></tr>
              )}
              {localEntries.map(entry => (
                <tr key={entry.id} className="cg-row-item">
                  <td>
                    {entry.name}
                    {entry.unit && <span style={{ color: '#4a5060', marginLeft: 8, fontSize: 10 }}>{entry.unit}</span>}
                  </td>
                  <td className="r" style={{ color: '#7a8ba0' }}>{fmt$(entry.unit_cost)}</td>
                  <td className="r" style={{ color: '#7a8ba0' }}>{fmt$(entry.unit_price)}</td>
                  <td className="r">
                    <InputNumber size="small" value={entry.qty} min={0} precision={4} controls={false}
                      onChange={v => updateQty(entry.id, v)}
                      style={{ width: 64, background: '#0d1122', borderColor: '#2e3550', color: '#f0ede8', fontSize: 11 }} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Tooltip title="Remove from group" mouseEnterDelay={1}><button className="cg-bib del" onClick={() => removeEntry(entry.id)}><DeleteOutlined /></button></Tooltip>
                  </td>
                </tr>
              ))}

              {addItemOpen && (
                <tr className="cg-inline-add">
                  <td colSpan={5}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Select
                        showSearch autoFocus size="small"
                        placeholder="Select item..."
                        style={{ flex: 1, minWidth: 200 }}
                        value={addItemId}
                        onChange={setAddItemId}
                        filterOption={(inp, opt) => opt?.label?.toLowerCase().includes(inp.toLowerCase())}
                        options={availableItems.map(ci => ({ value: ci.id, label: ci.name }))}
                        styles={{ popup: { root: { background: '#0f1320' } } }}
                        notFoundContent={<span style={{ color: '#4a5060', fontSize: 12 }}>No items available</span>}
                      />
                      <InputNumber size="small" min={0} precision={4} value={addItemQty} onChange={setAddItemQty}
                        placeholder="Qty" style={{ width: 72, background: '#0d1122', borderColor: '#2e3550', color: '#f0ede8' }} />
                      <Button size="small" type="primary" onClick={addItem} disabled={!addItemId}
                        style={{ background: '#d4870a', borderColor: '#d4870a' }}>Add</Button>
                      <Button size="small" onClick={() => { setAddItemOpen(false); setAddItemId(null); setAddItemQty(1); }}>Cancel</Button>
                    </div>
                  </td>
                </tr>
              )}

              <tr className="cg-add-row">
                <td colSpan={5}>
                  {!addItemOpen && (
                    <button className="cg-add-btn" onClick={() => { setAddItemOpen(true); setAddItemId(null); setAddItemQty(1); }}>+ Item</button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {isNew && localEntries.length > 0 && (
            <p style={{ color: '#4a5060', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, marginTop: 8 }}>
              All items will be saved when you click Create.
            </p>
          )}
        </>
      )}
    </Modal>
  );
}

// ─── Groups Tab ───────────────────────────────────────────────────────────────

function GroupsTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['catalog-groups'],
    queryFn: async () => { const { data } = await client.get('/catalog/groups'); return data; },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['catalog-groups'] });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await client.delete(`/catalog/groups/${id}`); },
    onSuccess: () => { invalidate(); message.success('Group deleted'); },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to delete group'),
  });

  const openNew = () => { setEditingGroup(null); setModalOpen(true); };
  const openEdit = (group) => { setEditingGroup(group); setModalOpen(true); };

  const handleClose = () => {
    setModalOpen(false);
    setEditingGroup(null);
    invalidate();
  };

  // Only show root-level groups (no nesting in catalog)
  const rootGroups = groups.filter(g => !g.parent_id);

  const columns = [
    {
      title: 'Name', dataIndex: 'name',
      render: (v) => (
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.04em' }}>{v}</span>
      ),
    },
    { title: 'Description', dataIndex: 'description', render: (v) => v || <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'Items', dataIndex: 'item_count', width: 70, align: 'right', render: (v) => <span style={{ color: '#9aa0b4' }}>{v}</span> },
    {
      title: '', key: 'actions', width: 100, align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }} />
          <Popconfirm title="Delete this group?" description="All items will be removed from this group." onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Button size="small" icon={<DeleteOutlined />} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#4a5060' }} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button className="catalog-action-btn" icon={<PlusOutlined />} onClick={openNew}>New Group</Button>
      </div>
      <Table
        className="catalog-table"
        columns={columns}
        dataSource={rootGroups}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 25, showSizeChanger: false }}
        size="small"
      />
      <GroupEditorModal open={modalOpen} group={editingGroup} onClose={handleClose} />
    </div>
  );
}

// ─── Catalog page ─────────────────────────────────────────────────────────────

export default function Catalog() {
  return (
    <>
      <style>{pageStyles}</style>
      <div className="catalog-page">
        <div className="catalog-page-title">CATA<span>LOG</span></div>
        <Tabs
          className="catalog-tabs"
          defaultActiveKey="items"
          destroyInactiveTabPane={false}
          items={[
            { key: 'items', label: 'Items', children: <ItemsTab /> },
            { key: 'groups', label: 'Groups', children: <GroupsTab /> },
          ]}
        />
      </div>
    </>
  );
}

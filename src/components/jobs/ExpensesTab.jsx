import React, { useState, useRef } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Switch, Select, Popconfirm, Space, message, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PaperClipOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

const expStyles = `
  .exp-table .ant-table { background: #141826 !important; color: #f0ede8 !important; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
  .exp-table .ant-table-thead > tr > th { background: #0f1320 !important; color: #9aa0b4 !important; font-family: 'Barlow Condensed', sans-serif !important; font-size: 11px !important; font-weight: 700 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; border-bottom: 1px solid #2e3550 !important; }
  .exp-table .ant-table-tbody > tr > td { background: #141826 !important; color: #f0ede8 !important; border-bottom: 1px solid #1e2436 !important; }
  .exp-table .ant-table-tbody > tr:hover > td { background: #1a2035 !important; }
  .exp-modal .ant-modal-content { background: #141826 !important; border: 1px solid #2e3550 !important; }
  .exp-modal .ant-modal-header { background: #141826 !important; border-bottom: 1px solid #2e3550 !important; }
  .exp-modal .ant-modal-title { font-family: 'Barlow Condensed', sans-serif !important; font-size: 16px !important; font-weight: 700 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; color: #f0ede8 !important; }
  .exp-modal .ant-modal-footer { border-top: 1px solid #2e3550 !important; background: #141826 !important; }
  .exp-modal .ant-form-item-label > label { font-family: 'Barlow Condensed', sans-serif !important; font-size: 11px !important; font-weight: 700 !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: #9aa0b4 !important; }
  .exp-modal .ant-input, .exp-modal .ant-input-number-input { background: #0f1320 !important; border-color: #2e3550 !important; color: #f0ede8 !important; font-family: 'IBM Plex Mono', monospace !important; font-size: 12px !important; }
  .exp-modal .ant-input-number { background: #0f1320 !important; border-color: #2e3550 !important; }
  .exp-modal .ant-select .ant-select-selector { background: #0f1320 !important; border-color: #2e3550 !important; color: #f0ede8 !important; }
`;

const fmt$ = (v) => (v == null ? '—' : `$${Number(v).toFixed(2)}`);

export default function ExpensesTab({ jobId }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const fileInputRef = useRef(null);
  const [receiptTargetId, setReceiptTargetId] = useState(null);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', jobId],
    queryFn: async () => { const { data } = await client.get(`/jobs/${jobId}/expenses`); return data; },
  });

  const { data: budgetEntries = [] } = useQuery({
    queryKey: ['budget', jobId],
    queryFn: async () => { const { data } = await client.get(`/jobs/${jobId}/budget`); return data; },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['expenses', jobId] });

  const createMutation = useMutation({
    mutationFn: async (values) => { const { data } = await client.post(`/jobs/${jobId}/expenses`, values); return data; },
    onSuccess: () => { invalidate(); closeModal(); message.success('Expense added'); },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to add expense'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }) => { const { data } = await client.put(`/jobs/${jobId}/expenses/${id}`, values); return data; },
    onSuccess: () => { invalidate(); closeModal(); message.success('Expense updated'); },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to update expense'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await client.delete(`/jobs/${jobId}/expenses/${id}`); },
    onSuccess: () => { invalidate(); message.success('Expense deleted'); },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to delete'),
  });

  const toggleApprove = useMutation({
    mutationFn: async ({ id, approved }) => { await client.put(`/jobs/${jobId}/expenses/${id}`, { approved_for_payment: approved }); },
    onSuccess: invalidate,
    onError: (err) => message.error(err.response?.data?.error || 'Failed to update'),
  });

  const deleteReceiptMutation = useMutation({
    mutationFn: async (expenseId) => { await client.delete(`/jobs/${jobId}/expenses/${expenseId}/receipt`); },
    onSuccess: () => { invalidate(); message.success('Receipt removed'); },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to remove receipt'),
  });

  const handleReceiptUpload = async (expenseId, file) => {
    const formData = new FormData();
    formData.append('receipt', file);
    try {
      await client.post(`/jobs/${jobId}/expenses/${expenseId}/receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      invalidate();
      message.success('Receipt attached');
    } catch (err) {
      message.error(err.response?.data?.error || 'Upload failed');
    }
  };

  const viewReceipt = (expenseId) => {
    window.open(`/api/jobs/${jobId}/expenses/${expenseId}/receipt`, '_blank', 'noopener,noreferrer');
  };

  const triggerReceiptPicker = (expenseId) => {
    setReceiptTargetId(expenseId);
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const openNew = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (exp) => {
    setEditing(exp);
    form.setFieldsValue({
      vendor: exp.vendor, description: exp.description,
      amount: Number(exp.amount), po_number: exp.po_number,
      budget_entry_id: exp.budget_entry_id,
      approved_for_payment: exp.approved_for_payment,
    });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); form.resetFields(); };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editing) updateMutation.mutate({ id: editing.id, values });
      else createMutation.mutate(values);
    });
  };

  const itemEntries = budgetEntries.filter((e) => e.type === 'item');

  // Totals
  const totalAll = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalApproved = expenses.filter((e) => e.approved_for_payment).reduce((s, e) => s + Number(e.amount), 0);

  const columns = [
    { title: 'Vendor', dataIndex: 'vendor', render: (v) => v || <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'Description', dataIndex: 'description', render: (v) => v || <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'Budget Item', dataIndex: 'budget_entry_name', render: (v) => v ? <span style={{ color: '#9aa0b4', fontSize: 11 }}>{v}</span> : <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'PO #', dataIndex: 'po_number', width: 100, render: (v) => v || <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'Amount', dataIndex: 'amount', width: 110, align: 'right', render: (v) => <span style={{ fontWeight: 700 }}>{fmt$(v)}</span> },
    {
      title: 'Approved', dataIndex: 'approved_for_payment', width: 100, align: 'center',
      render: (v, record) => (
        <Switch
          size="small"
          checked={v}
          onChange={(checked) => toggleApprove.mutate({ id: record.id, approved: checked })}
          style={{ background: v ? '#3db87a' : undefined }}
        />
      ),
    },
    {
      title: 'Receipt',
      key: 'receipt',
      width: 90,
      align: 'center',
      render: (_, record) => record.receipt_filename ? (
        <Space size={4}>
          <Tooltip title={record.receipt_original_name}>
            <Button size="small" icon={<EyeOutlined />} onClick={() => viewReceipt(record.id)} style={{ background: 'transparent', border: '1px solid #3db87a', color: '#3db87a' }} />
          </Tooltip>
          <Popconfirm title="Remove receipt?" onConfirm={() => deleteReceiptMutation.mutate(record.id)} okText="Remove" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Tooltip title="Remove receipt" mouseEnterDelay={1}><Button size="small" icon={<DeleteOutlined />} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#4a5060' }} /></Tooltip>
          </Popconfirm>
        </Space>
      ) : (
        <Button size="small" icon={<PaperClipOutlined />} title="Attach receipt" onClick={() => triggerReceiptPicker(record.id)} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#4a5060' }} />
      ),
    },
    {
      title: '', key: 'actions', width: 70, align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit expense" mouseEnterDelay={1}><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }} /></Tooltip>
          <Popconfirm title="Delete this expense?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Tooltip title="Delete expense" mouseEnterDelay={1}><Button size="small" icon={<DeleteOutlined />} danger style={{ background: 'transparent', border: '1px solid #2e3550', color: '#4a5060' }} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <style>{expStyles}</style>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && receiptTargetId) handleReceiptUpload(receiptTargetId, file);
        }}
      />
      <div>
        {/* Summary row */}
        {expenses.length > 0 && (
          <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
            <div style={{ background: '#1e2436', border: '1px solid #2e3550', borderRadius: 6, padding: '10px 20px' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#4a5060', textTransform: 'uppercase', marginBottom: 4 }}>Total Expenses</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 700, color: '#f0ede8' }}>{fmt$(totalAll)}</div>
            </div>
            <div style={{ background: '#1e2436', border: '1px solid #2e3550', borderRadius: 6, padding: '10px 20px' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#4a5060', textTransform: 'uppercase', marginBottom: 4 }}>Approved for Payment</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 700, color: '#3db87a' }}>{fmt$(totalApproved)}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button
            icon={<PlusOutlined />}
            onClick={openNew}
            style={{ background: 'rgba(212,135,10,0.12)', border: '1px solid #d4870a', color: '#d4870a', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Add Expense
          </Button>
        </div>

        <Table
          className="exp-table"
          columns={columns}
          dataSource={expenses}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 25, showSizeChanger: false }}
        />

        <Modal
          className="exp-modal"
          open={modalOpen}
          title={editing ? 'EDIT EXPENSE' : 'ADD EXPENSE'}
          onCancel={closeModal}
          onOk={handleSubmit}
          confirmLoading={createMutation.isPending || updateMutation.isPending}
          okText={editing ? 'Save' : 'Add'}
          okButtonProps={{ style: { background: '#d4870a', borderColor: '#d4870a' } }}
          width={560}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="vendor" label="Vendor" style={{ marginBottom: 12 }}>
                <Input placeholder="Vendor name" />
              </Form.Item>
              <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Amount required' }]} style={{ marginBottom: 12 }}>
                <InputNumber prefix="$" precision={2} min={0} style={{ width: '100%', background: '#0f1320', borderColor: '#2e3550', color: '#f0ede8' }} placeholder="0.00" />
              </Form.Item>
            </div>
            <Form.Item name="description" label="Description" style={{ marginBottom: 12 }}>
              <Input.TextArea rows={2} placeholder="What was this expense for?" />
            </Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="po_number" label="PO Number" style={{ marginBottom: 12 }}>
                <Input placeholder="Optional" />
              </Form.Item>
              <Form.Item name="budget_entry_id" label="Budget Line Item" style={{ marginBottom: 12 }}>
                <Select
                  allowClear
                  placeholder="Link to budget item..."
                  options={itemEntries.map((e) => ({ value: e.id, label: e.name || '(unnamed)' }))}
                  styles={{ popup: { root: { background: '#0f1320' } } }}
                />
              </Form.Item>
            </div>
            <Form.Item name="approved_for_payment" label="Approved for Payment" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
}

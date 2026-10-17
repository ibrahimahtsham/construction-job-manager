import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Popconfirm, Space, message, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

const contactStyles = `
  .contacts-table .ant-table { background: #141826 !important; color: #f0ede8 !important; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
  .contacts-table .ant-table-thead > tr > th { background: #0f1320 !important; color: #9aa0b4 !important; font-family: 'Barlow Condensed', sans-serif !important; font-size: 11px !important; font-weight: 700 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; border-bottom: 1px solid #2e3550 !important; }
  .contacts-table .ant-table-tbody > tr > td { background: #141826 !important; color: #f0ede8 !important; border-bottom: 1px solid #1e2436 !important; }
  .contacts-table .ant-table-tbody > tr:hover > td { background: #1a2035 !important; }
  .contacts-modal .ant-modal-content { background: #141826 !important; border: 1px solid #2e3550 !important; }
  .contacts-modal .ant-modal-header { background: #141826 !important; border-bottom: 1px solid #2e3550 !important; }
  .contacts-modal .ant-modal-title { font-family: 'Barlow Condensed', sans-serif !important; font-size: 16px !important; font-weight: 700 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; color: #f0ede8 !important; }
  .contacts-modal .ant-modal-footer { border-top: 1px solid #2e3550 !important; background: #141826 !important; }
  .contacts-modal .ant-form-item-label > label { font-family: 'Barlow Condensed', sans-serif !important; font-size: 11px !important; font-weight: 700 !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: #9aa0b4 !important; }
  .contacts-modal .ant-input, .contacts-modal .ant-input-textarea textarea { background: #0f1320 !important; border-color: #2e3550 !important; color: #f0ede8 !important; font-family: 'IBM Plex Mono', monospace !important; font-size: 12px !important; }
`;

export default function ContactsTab({ jobId }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = new, obj = edit
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', jobId],
    queryFn: async () => { const { data } = await client.get(`/jobs/${jobId}/contacts`); return data; },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contacts', jobId] });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await client.delete(`/jobs/${jobId}/contacts/${id}`); },
    onSuccess: () => { invalidate(); message.success('Contact removed'); },
    onError: (err) => message.error(err.response?.data?.error || 'Delete failed'),
  });

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({ name: record.name, email: record.email || '', phone: record.phone || '', role: record.role || '', note: record.note || '' });
    setOpen(true);
  };

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      if (editing) {
        await client.put(`/jobs/${jobId}/contacts/${editing.id}`, values);
        message.success('Contact updated');
      } else {
        await client.post(`/jobs/${jobId}/contacts`, values);
        message.success('Contact added');
      }
      invalidate();
      setOpen(false);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (v) => <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14 }}>{v}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      width: 130,
      render: (v) => v ? <span style={{ color: '#9aa0b4' }}>{v}</span> : <span style={{ color: '#4a5060' }}>—</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      width: 200,
      render: (v) => v ? <span style={{ color: '#9aa0b4' }}>{v}</span> : <span style={{ color: '#4a5060' }}>—</span>,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      width: 140,
      render: (v) => v ? <span style={{ color: '#9aa0b4' }}>{v}</span> : <span style={{ color: '#4a5060' }}>—</span>,
    },
    {
      title: 'Note',
      dataIndex: 'note',
      render: (v) => v ? <span style={{ color: '#4a5060', fontSize: 11 }}>{v}</span> : null,
    },
    {
      title: '',
      key: 'actions',
      width: 70,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit contact" mouseEnterDelay={1}>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }}
            />
          </Tooltip>
          <Popconfirm
            title="Remove this contact?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Remove"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete contact" mouseEnterDelay={1}>
              <Button
                size="small"
                icon={<DeleteOutlined />}
                danger
                style={{ background: 'transparent', border: '1px solid #2e3550', color: '#4a5060' }}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <style>{contactStyles}</style>
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button
            icon={<PlusOutlined />}
            onClick={openNew}
            style={{ background: 'rgba(212,135,10,0.12)', border: '1px solid #d4870a', color: '#d4870a', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Add Contact
          </Button>
        </div>

        <Table
          className="contacts-table"
          columns={columns}
          dataSource={contacts}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={false}
          locale={{ emptyText: <span style={{ color: '#4a5060', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}>No additional contacts.</span> }}
        />

        <Modal
          className="contacts-modal"
          open={open}
          title={editing ? 'EDIT CONTACT' : 'ADD CONTACT'}
          onCancel={() => setOpen(false)}
          onOk={handleSave}
          confirmLoading={saving}
          okText={editing ? 'Save Changes' : 'Add Contact'}
          okButtonProps={{ style: { background: '#d4870a', borderColor: '#d4870a' } }}
          width={480}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]} style={{ marginBottom: 12 }}>
              <Input placeholder="Contact name" />
            </Form.Item>
            <Form.Item name="role" label="Role / Title" style={{ marginBottom: 12 }}>
              <Input placeholder="e.g. Owner, Tenant, Contractor..." />
            </Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="email" label="Email" style={{ marginBottom: 12 }}>
                <Input placeholder="email@example.com" />
              </Form.Item>
              <Form.Item name="phone" label="Phone" style={{ marginBottom: 12 }}>
                <Input placeholder="(555) 000-0000" />
              </Form.Item>
            </div>
            <Form.Item name="note" label="Note" style={{ marginBottom: 0 }}>
              <Input.TextArea rows={2} placeholder="Optional note..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
}

import React, { useState, useCallback, useRef } from 'react';
import { Table, Button, Modal, Form, Input, Popconfirm, Space, message, Tooltip, Tag, AutoComplete, Upload, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined, UserOutlined, UploadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client.js';
import CategorySelect from '../components/common/CategorySelect.jsx';
import LocationPicker from '../components/common/LocationPicker.jsx';

const pageStyles = `
  .cust-page { padding: 32px; min-height: 100%; background: #141826; color: #f0ede8; }
  .cust-title { font-family: 'Barlow Condensed', sans-serif; font-size: 28px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #f0ede8; margin-bottom: 8px; line-height: 1; }
  .cust-title span { color: #d4870a; }
  .cust-subtitle { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #4a5060; margin-bottom: 28px; }
  .cust-table .ant-table { background: #141826 !important; color: #f0ede8 !important; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
  .cust-table .ant-table-thead > tr > th { background: #0f1320 !important; color: #9aa0b4 !important; font-family: 'Barlow Condensed', sans-serif !important; font-size: 11px !important; font-weight: 700 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; border-bottom: 1px solid #2e3550 !important; }
  .cust-table .ant-table-tbody > tr > td { background: #141826 !important; color: #f0ede8 !important; border-bottom: 1px solid #1e2436 !important; }
  .cust-table .ant-table-tbody > tr:hover > td { background: #1a2035 !important; }
  .cust-table .ant-table-expanded-row > td { background: #0f1320 !important; padding: 0 !important; }
  .cust-table .ant-table-row-expand-icon { background: #1e2436 !important; border-color: #2e3550 !important; color: #d4870a !important; }
  .loc-inner { padding: 12px 24px 12px 60px; background: #0f1320; border-bottom: 1px solid #1e2436; }
  .loc-table .ant-table { background: #0f1320 !important; font-size: 11px !important; }
  .loc-table .ant-table-thead > tr > th { background: #080d19 !important; color: #4a5060 !important; font-family: 'Barlow Condensed', sans-serif !important; font-size: 10px !important; font-weight: 700 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; border-bottom: 1px solid #1e2436 !important; }
  .loc-table .ant-table-tbody > tr > td { background: #0f1320 !important; color: #9aa0b4 !important; border-bottom: 1px solid #151e30 !important; }
  .loc-table .ant-table-tbody > tr:hover > td { background: #141826 !important; }
  .cust-modal .ant-modal-content { background: #141826 !important; border: 1px solid #2e3550 !important; }
  .cust-modal .ant-modal-header { background: #141826 !important; border-bottom: 1px solid #2e3550 !important; }
  .cust-modal .ant-modal-title { font-family: 'Barlow Condensed', sans-serif !important; font-size: 16px !important; font-weight: 700 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; color: #f0ede8 !important; }
  .cust-modal .ant-modal-footer { border-top: 1px solid #2e3550 !important; background: #141826 !important; }
  .cust-modal .ant-form-item-label > label { font-family: 'Barlow Condensed', sans-serif !important; font-size: 11px !important; font-weight: 700 !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: #9aa0b4 !important; }
  .cust-modal .ant-input, .cust-modal .ant-input-textarea textarea { background: #0f1320 !important; border-color: #2e3550 !important; color: #f0ede8 !important; font-family: 'IBM Plex Mono', monospace !important; font-size: 12px !important; }
  .cust-modal .ant-select .ant-select-selector { background: #0f1320 !important; border-color: #2e3550 !important; color: #f0ede8 !important; }
  .cust-table .ant-checkbox-inner { background: #0f1320 !important; border-color: #2e3550 !important; }
  .cust-table .ant-checkbox-checked .ant-checkbox-inner { background: #d4870a !important; border-color: #d4870a !important; }
  .cust-table .ant-checkbox-wrapper:hover .ant-checkbox-inner, .cust-table .ant-checkbox:hover .ant-checkbox-inner { border-color: #d4870a !important; }
`;

const TYPE_COLORS = { commercial: '#3b82f6', residential: '#3db87a', other: '#9aa0b4' };

function CustomerModal({ open, onClose, editing, onSuccess }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      form.setFieldsValue(editing ? { account_name: editing.account_name, type: editing.type, lead_source: editing.lead_source } : {});
    }
  }, [open, editing]);

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      if (editing) await client.put(`/customers/${editing.id}`, values);
      else await client.post('/customers', values);
      onSuccess();
      onClose();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <Modal className="cust-modal" open={open} title={editing ? 'EDIT CUSTOMER' : 'ADD CUSTOMER'}
      onCancel={onClose} onOk={handleSave} confirmLoading={saving}
      okText={editing ? 'Save Changes' : 'Add Customer'}
      okButtonProps={{ style: { background: '#d4870a', borderColor: '#d4870a' } }}
      width={480} destroyOnHidden>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="account_name" label="Account Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
          <Input placeholder="Company or person name" />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="type" label="Type" style={{ marginBottom: 0 }}>
            <CategorySelect category="customer_type" allowClear placeholder="Select type" />
          </Form.Item>
          <Form.Item name="lead_source" label="Lead Source" style={{ marginBottom: 0 }}>
            <CategorySelect category="lead_source" allowClear placeholder="Select source" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

function LocationModal({ open, onClose, editing, customerId, onSuccess }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [addressOptions, setAddressOptions] = useState([]);
  const [pinLat, setPinLat] = useState(null);
  const [pinLng, setPinLng] = useState(null);
  const addressDebounceRef = useRef(null);

  const searchAddress = useCallback((value) => {
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    if (!value || value.length < 3) { setAddressOptions([]); return; }
    addressDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&addressdetails=1&countrycodes=us&limit=6`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setAddressOptions(data.map((item) => ({
          value: item.display_name,
          label: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        })));
      } catch { setAddressOptions([]); }
    }, 350);
  }, []);

  React.useEffect(() => {
    if (open) {
      setAddressOptions([]);
      if (editing) {
        setPinLat(editing.lat ? parseFloat(editing.lat) : null);
        setPinLng(editing.lng ? parseFloat(editing.lng) : null);
        form.setFieldsValue({
          address: editing.address, entry_code: editing.entry_code,
          foundation_type: editing.foundation_type, location_notes: editing.location_notes,
          primary_contact_name: editing.primary_contact_name, primary_contact_email: editing.primary_contact_email,
          primary_contact_phone: editing.primary_contact_phone,
        });
      } else {
        setPinLat(null);
        setPinLng(null);
        form.setFieldsValue({});
      }
    }
  }, [open, editing]);

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    const payload = { ...values, lat: pinLat || undefined, lng: pinLng || undefined };
    try {
      if (editing) await client.put(`/locations/${editing.id}`, payload);
      else await client.post('/locations', { ...payload, customer_id: customerId });
      onSuccess();
      onClose();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <Modal className="cust-modal" open={open} title={editing ? 'EDIT LOCATION' : 'ADD LOCATION'}
      onCancel={onClose} onOk={handleSave} confirmLoading={saving}
      okText={editing ? 'Save Changes' : 'Add Location'}
      okButtonProps={{ style: { background: '#d4870a', borderColor: '#d4870a' } }}
      width={560} destroyOnHidden>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="address" label="Address" style={{ marginBottom: 12 }}>
          <AutoComplete
            options={addressOptions}
            onSearch={searchAddress}
            onSelect={(value, option) => {
              if (option.lat) { setPinLat(option.lat); setPinLng(option.lng); }
            }}
            filterOption={false}
            placeholder="Start typing an address..."
          />
        </Form.Item>
        <LocationPicker
          lat={pinLat}
          lng={pinLng}
          onChange={(lat, lng, displayName) => {
            setPinLat(lat);
            setPinLng(lng);
            if (displayName) form.setFieldValue('address', displayName);
          }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="entry_code" label="Entry Code" style={{ marginBottom: 12 }}>
            <Input placeholder="Gate/door code" />
          </Form.Item>
          <Form.Item name="foundation_type" label="Foundation Type" style={{ marginBottom: 12 }}>
            <CategorySelect category="foundation_type" allowClear placeholder="Select..." />
          </Form.Item>
        </div>
        <Form.Item name="location_notes" label="Notes" style={{ marginBottom: 12 }}>
          <Input.TextArea rows={2} placeholder="Access notes, special instructions..." />
        </Form.Item>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#d4870a', textTransform: 'uppercase', marginBottom: 8 }}>Primary Contact</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Form.Item name="primary_contact_name" label="Name" style={{ marginBottom: 0 }}>
            <Input placeholder="Contact name" />
          </Form.Item>
          <Form.Item name="primary_contact_email" label="Email" style={{ marginBottom: 0 }}>
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item name="primary_contact_phone" label="Phone" style={{ marginBottom: 0 }}>
            <Input placeholder="(555) 000-0000" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

function LocationsPanel({ customerId, onAddLocation }) {
  const queryClient = useQueryClient();
  const [locModal, setLocModal] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', customerId],
    queryFn: async () => { const { data } = await client.get(`/locations?customer_id=${customerId}`); return data; },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await client.delete(`/locations/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['locations', customerId] }); queryClient.invalidateQueries({ queryKey: ['customers'] }); message.success('Location deleted'); },
    onError: (err) => message.error(err.response?.data?.error || 'Delete failed'),
  });

  const columns = [
    { title: 'Address', dataIndex: 'address', render: (v) => v || <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'Foundation', dataIndex: 'foundation_type', width: 130, render: (v) => v || <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'Primary Contact', dataIndex: 'primary_contact_name', width: 160, render: (v) => v || <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'Email', dataIndex: 'primary_contact_email', width: 190, render: (v) => v || <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'Phone', dataIndex: 'primary_contact_phone', width: 130, render: (v) => v || <span style={{ color: '#4a5060' }}>—</span> },
    {
      title: '', key: 'actions', width: 70, align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit location" mouseEnterDelay={1}>
            <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingLoc(record); setLocModal(true); }} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }} />
          </Tooltip>
          <Popconfirm title="Delete this location?" description="Cannot delete if jobs are linked to it." onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Tooltip title="Delete location" mouseEnterDelay={1}>
              <Button size="small" icon={<DeleteOutlined />} danger style={{ background: 'transparent', border: '1px solid #2e3550', color: '#4a5060' }} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="loc-inner">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#4a5060', textTransform: 'uppercase' }}>
          <EnvironmentOutlined style={{ marginRight: 6 }} />Locations
        </span>
        <Button size="small" icon={<PlusOutlined />} onClick={() => { setEditingLoc(null); setLocModal(true); }}
          style={{ background: 'rgba(212,135,10,0.1)', border: '1px solid #d4870a', color: '#d4870a', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }}>
          Add Location
        </Button>
      </div>
      <Table className="loc-table" columns={columns} dataSource={locations} rowKey="id" loading={isLoading}
        size="small" pagination={false}
        locale={{ emptyText: <span style={{ color: '#4a5060', fontSize: 11 }}>No locations yet.</span> }} />
      <LocationModal open={locModal} onClose={() => setLocModal(false)} editing={editingLoc} customerId={customerId}
        onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['locations', customerId] }); queryClient.invalidateQueries({ queryKey: ['customers'] }); }} />
    </div>
  );
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  return lines.slice(1).map(line => {
    const fields = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { fields.push(cur); cur = ''; }
      else cur += ch;
    }
    fields.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (fields[i] || '').trim(); });
    return obj;
  }).filter(r => r.name || r.account_name);
}

function csvRowsToImport(rows) {
  return rows.map(r => {
    const accountName = r.name || r.account_name || '';
    const contactName = r.company && r.company !== accountName ? r.company : (r.contact_name || r.company || '');
    const street = r.street || '';
    const city   = r.city   || '';
    const state  = r.state  || '';
    const zip    = r.zip    || '';
    const parts  = [street, city, (state && zip) ? `${state} ${zip}` : (state || zip)].filter(Boolean);
    return {
      account_name: accountName,
      contact_name: contactName || null,
      email:   r.email || null,
      phone:   r.phone || null,
      address: parts.join(', ') || null,
    };
  });
}

function CSVImportModal({ open, onClose, onSuccess }) {
  const [csvText, setCsvText]     = useState('');
  const [preview, setPreview]     = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState(null);

  const handleClose = () => {
    setCsvText(''); setPreview(null); setResult(null);
    onClose();
  };

  const handleParse = () => {
    const rows = parseCSV(csvText);
    if (!rows.length) { message.error('No valid rows found — check the CSV format.'); return; }
    setPreview(csvRowsToImport(rows));
    setResult(null);
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => { setCsvText(e.target.result); };
    reader.readAsText(file);
    return false; // prevent antd auto-upload
  };

  const handleImport = async () => {
    if (!preview?.length) return;
    setImporting(true);
    try {
      const { data } = await client.post('/customers/import-csv', preview);
      setResult(data);
      onSuccess();
    } catch (err) {
      message.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const previewColumns = [
    { title: 'Account Name', dataIndex: 'account_name', width: 180 },
    { title: 'Contact', dataIndex: 'contact_name', width: 150, render: v => v || <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'Email', dataIndex: 'email', ellipsis: true, render: v => v || <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'Phone', dataIndex: 'phone', width: 130, render: v => v || <span style={{ color: '#4a5060' }}>—</span> },
    { title: 'Address', dataIndex: 'address', ellipsis: true, render: v => v || <span style={{ color: '#4a5060' }}>—</span> },
  ];

  return (
    <Modal
      className="cust-modal"
      open={open}
      title="IMPORT CUSTOMERS FROM CSV"
      onCancel={handleClose}
      width={820}
      destroyOnHidden
      footer={
        preview && !result ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setPreview(null)} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }}>Back</Button>
            <Button loading={importing} onClick={handleImport}
              style={{ background: '#d4870a', borderColor: '#d4870a', color: '#fff', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }}>
              Import {preview.length} Customers
            </Button>
          </div>
        ) : result ? (
          <Button onClick={handleClose} style={{ background: '#d4870a', borderColor: '#d4870a', color: '#fff' }}>Done</Button>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleClose} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }}>Cancel</Button>
            <Button onClick={handleParse} disabled={!csvText.trim()}
              style={{ background: '#d4870a', borderColor: '#d4870a', color: '#fff', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }}>
              Preview
            </Button>
          </div>
        )
      }
    >
      {result ? (
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32, fontWeight: 700, color: '#3db87a' }}>{result.imported}</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4a5060' }}>imported</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32, fontWeight: 700, color: '#4a5060' }}>{result.skipped}</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4a5060' }}>skipped (already exist)</div>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <Alert type="warning" message={`${result.errors.length} row(s) had errors`}
              description={result.errors.slice(0, 5).join('\n')} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }} />
          )}
        </div>
      ) : preview ? (
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4a5060', marginBottom: 12 }}>
            {preview.length} rows parsed — review then click Import.
          </div>
          <Table
            className="cust-table"
            size="small"
            columns={previewColumns}
            dataSource={preview}
            rowKey={(r, i) => i}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: true }}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4a5060', lineHeight: 1.6 }}>
            Expected columns: <span style={{ color: '#9aa0b4' }}>Name, Company, Email, Phone, Website, Street, City, State, ZIP, Country</span>
            <br />Existing customers (matched by name) will be skipped.
          </div>

          <Upload.Dragger
            accept=".csv,text/csv"
            showUploadList={false}
            beforeUpload={handleFileUpload}
            style={{ background: '#0f1320', border: '1px dashed #2e3550', borderRadius: 4 }}
          >
            <div style={{ padding: '12px 0', color: '#4a5060', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>
              <UploadOutlined style={{ fontSize: 20, marginBottom: 8, display: 'block' }} />
              Click or drag a .csv file here
            </div>
          </Upload.Dragger>

          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#4a5060', textTransform: 'uppercase', textAlign: 'center' }}>
            — or paste CSV text below —
          </div>

          <Input.TextArea
            rows={8}
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            placeholder="Paste CSV content here..."
            style={{ background: '#0f1320', borderColor: '#2e3550', color: '#f0ede8', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}
          />
        </div>
      )}
    </Modal>
  );
}

export default function Customers() {
  const queryClient = useQueryClient();
  const [custModal, setCustModal] = useState(false);
  const [editingCust, setEditingCust] = useState(null);
  const [importModal, setImportModal] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => { const { data } = await client.get('/customers'); return data; },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await client.delete(`/customers/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); message.success('Customer deleted'); },
    onError: (err) => message.error(err.response?.data?.error || 'Delete failed'),
  });

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => client.delete(`/customers/${id}`)));
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      message.success(`${selectedRowKeys.length} customer${selectedRowKeys.length > 1 ? 's' : ''} deleted`);
      setSelectedRowKeys([]);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to delete customers');
    }
  };

  const filtered = customers.filter(c => c.account_name.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    {
      title: 'Account Name',
      dataIndex: 'account_name',
      render: (v) => <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15 }}>{v}</span>,
    },
    {
      title: 'Type', dataIndex: 'type', width: 120,
      render: (v) => v ? <Tag style={{ background: `${TYPE_COLORS[v]}22`, border: `1px solid ${TYPE_COLORS[v]}55`, color: TYPE_COLORS[v], fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.06em' }}>{v.toUpperCase()}</Tag> : <span style={{ color: '#4a5060' }}>—</span>,
    },
    {
      title: 'Lead Source', dataIndex: 'lead_source', width: 140,
      render: (v) => v ? <span style={{ color: '#9aa0b4' }}>{v}</span> : <span style={{ color: '#4a5060' }}>—</span>,
    },
    {
      title: 'Locations', dataIndex: 'location_count', width: 100, align: 'center',
      render: (v) => <span style={{ color: v > 0 ? '#d4870a' : '#4a5060' }}><EnvironmentOutlined style={{ marginRight: 4 }} />{v}</span>,
    },
    {
      title: 'Jobs', dataIndex: 'job_count', width: 80, align: 'center',
      render: (v) => <span style={{ color: v > 0 ? '#9aa0b4' : '#4a5060' }}>{v}</span>,
    },
    {
      title: '', key: 'actions', width: 80, align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit customer" mouseEnterDelay={1}>
            <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); setEditingCust(record); setCustModal(true); }} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }} />
          </Tooltip>
          <Popconfirm title="Delete this customer?" description="Cannot delete if jobs are linked to it." onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Tooltip title="Delete customer" mouseEnterDelay={1}>
              <Button size="small" icon={<DeleteOutlined />} danger style={{ background: 'transparent', border: '1px solid #2e3550', color: '#4a5060' }} onClick={(e) => e.stopPropagation()} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <style>{pageStyles}</style>
      <div className="cust-page">
        <div className="cust-title">CUSTO<span>MERS</span></div>
        <div className="cust-subtitle">Manage accounts and their locations</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, maxWidth: 900 }}>
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 260, background: '#0f1320', borderColor: '#2e3550', color: '#f0ede8', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}
          />
          <Space>
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={`Delete ${selectedRowKeys.length} customer${selectedRowKeys.length > 1 ? 's' : ''}?`}
                description="Cannot delete customers that have jobs linked to them."
                onConfirm={handleBulkDelete}
                okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}
              >
                <Button danger>Delete {selectedRowKeys.length} selected</Button>
              </Popconfirm>
            )}
            <Button icon={<UploadOutlined />} onClick={() => setImportModal(true)}
              style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.08em' }}>
              Import CSV
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => { setEditingCust(null); setCustModal(true); }}
              style={{ background: 'rgba(212,135,10,0.12)', border: '1px solid #d4870a', color: '#d4870a', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.08em' }}>
              Add Customer
            </Button>
          </Space>
        </div>

        <Table
          className="cust-table"
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          size="small"
          style={{ maxWidth: 900 }}
          pagination={{
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['25', '50', '100', '500'],
            onShowSizeChange: (_, size) => setPageSize(size),
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            type: 'checkbox',
            onSelectAll: (selected) => setSelectedRowKeys(selected ? filtered.map(c => c.id) : []),
            selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
          }}
          expandable={{
            expandedRowRender: (record) => <LocationsPanel customerId={record.id} />,
            rowExpandable: () => true,
          }}
          locale={{ emptyText: <span style={{ color: '#4a5060', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}>No customers yet.</span> }}
        />
      </div>

      <CustomerModal open={custModal} onClose={() => setCustModal(false)} editing={editingCust}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['customers'] })} />
      <CSVImportModal open={importModal} onClose={() => setImportModal(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['customers'] })} />
    </>
  );
}

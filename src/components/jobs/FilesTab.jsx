import React, { useState, useRef } from 'react';
import { Table, Button, Popconfirm, Switch, message, Space, Tooltip } from 'antd';
import { UploadOutlined, DownloadOutlined, DeleteOutlined, FileOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

const fileStyles = `
  .files-table .ant-table { background: #141826 !important; color: #f0ede8 !important; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
  .files-table .ant-table-thead > tr > th { background: #0f1320 !important; color: #9aa0b4 !important; font-family: 'Barlow Condensed', sans-serif !important; font-size: 11px !important; font-weight: 700 !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; border-bottom: 1px solid #2e3550 !important; }
  .files-table .ant-table-tbody > tr > td { background: #141826 !important; color: #f0ede8 !important; border-bottom: 1px solid #1e2436 !important; }
  .files-table .ant-table-tbody > tr:hover > td { background: #1a2035 !important; }
`;

function fmtBytes(n) {
  if (!n) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

function formatDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FilesTab({ jobId }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files', jobId],
    queryFn: async () => { const { data } = await client.get(`/jobs/${jobId}/files`); return data; },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['files', jobId] });

  const deleteMutation = useMutation({
    mutationFn: async (fileId) => { await client.delete(`/jobs/${jobId}/files/${fileId}`); },
    onSuccess: () => { invalidate(); message.success('File deleted'); },
    onError: (err) => message.error(err.response?.data?.error || 'Delete failed'),
  });

  const visibilityMutation = useMutation({
    mutationFn: async ({ fileId, customer_visible }) => {
      await client.patch(`/jobs/${jobId}/files/${fileId}`, { customer_visible });
    },
    onSuccess: () => invalidate(),
    onError: (err) => message.error(err.response?.data?.error || 'Update failed'),
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await client.post(`/jobs/${jobId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      invalidate();
      message.success(`${file.name} uploaded`);
    } catch (err) {
      message.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (file) => {
    try {
      const res = await client.get(`/jobs/${jobId}/files/${file.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      message.error('Download failed');
    }
  };

  const columns = [
    {
      title: 'File Name',
      dataIndex: 'original_name',
      render: (v) => (
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}>
          <FileOutlined style={{ color: '#4a5060', marginRight: 8 }} />
          {v}
        </span>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      width: 90,
      render: (v) => <span style={{ color: '#9aa0b4', fontSize: 12 }}>{fmtBytes(v)}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'mimetype',
      width: 160,
      render: (v) => <span style={{ color: '#4a5060', fontSize: 11 }}>{v || '—'}</span>,
    },
    {
      title: 'Uploaded By',
      dataIndex: 'uploaded_by_name',
      width: 130,
      render: (v) => <span style={{ color: '#9aa0b4', fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      width: 130,
      render: (v) => <span style={{ color: '#4a5060', fontSize: 11 }}>{formatDate(v)}</span>,
    },
    {
      title: <span title="Visible to customer in portal"><EyeOutlined /> Portal</span>,
      dataIndex: 'customer_visible',
      width: 90,
      align: 'center',
      render: (val, record) => (
        <Switch
          size="small"
          checked={!!val}
          onChange={(checked) => visibilityMutation.mutate({ fileId: record.id, customer_visible: checked })}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            title="Download"
            onClick={() => downloadFile(record)}
            style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }}
          />
          <Popconfirm
            title="Delete this file?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete file" mouseEnterDelay={1}>
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
      <style>{fileStyles}</style>
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
          <Button
            icon={<UploadOutlined />}
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
            style={{ background: 'rgba(212,135,10,0.12)', border: '1px solid #d4870a', color: '#d4870a', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.08em' }}
          >
            Upload File
          </Button>
        </div>

        <Table
          className="files-table"
          columns={columns}
          dataSource={files}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 25, showSizeChanger: false }}
          locale={{ emptyText: <span style={{ color: '#4a5060', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}>No files uploaded yet.</span> }}
        />
      </div>
    </>
  );
}

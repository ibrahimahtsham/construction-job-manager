import React from 'react';
import { Button, Popconfirm, Space, Tag, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, EnvironmentOutlined } from '@ant-design/icons';

const { Text } = Typography;

const STATUS_STYLES = {
  active:          { bg: '#1a3a2a', border: '#2a7a4b', color: '#3db87a', label: 'In Progress' },
  pending_permit:  { bg: '#3a2800', border: '#7a5500', color: '#d4870a', label: 'Pending Permit' },
  completed:       { bg: '#1a1e30', border: '#2e3550', color: '#9aa0b4', label: 'Completed' },
};

const JOB_TYPE_COLORS = {
  'New Construction': '#2a7a4b',
  'Project': '#1a5a8a',
  'Maintenance/Repair': '#7a4a1a',
  'Service': '#4a1a7a',
};

export function getJobColumns({ onEdit, onDelete, showStatus = false }) {
  return [
    {
      title: 'Job #',
      dataIndex: 'job_number',
      key: 'job_number',
      fixed: 'left',
      width: 90,
      sorter: (a, b) => (a.job_number || '').localeCompare(b.job_number || ''),
      render: (val) => (
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            color: '#d4870a',
            fontWeight: 600,
          }}
        >
          {val || '—'}
        </span>
      ),
    },
    {
      title: 'Job Name',
      dataIndex: 'job_name',
      key: 'job_name',
      fixed: 'left',
      width: 180,
      sorter: (a, b) => (a.job_name || '').localeCompare(b.job_name || ''),
      render: (val) => (
        <Text
          strong
          className="job-name-cell"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: '#f0ede8',
            cursor: 'default',
            transition: 'color 0.15s',
          }}
        >
          {val}
        </Text>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'account_name',
      key: 'account_name',
      width: 160,
      sorter: (a, b) => (a.account_name || '').localeCompare(b.account_name || ''),
      render: (val) => (
        <span style={{ color: '#f0ede8' }}>{val || '—'}</span>
      ),
    },
    {
      title: 'Appointment',
      dataIndex: 'appointment',
      key: 'appointment',
      width: 130,
      sorter: (a, b) => new Date(a.appointment || 0) - new Date(b.appointment || 0),
      render: (val) => {
        if (!val) return <span style={{ color: '#4a5060' }}>—</span>;
        const d = new Date(val);
        return (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#f0ede8' }}>
            {(d.getUTCMonth() + 1).toString().padStart(2, '0')}/
            {d.getUTCDate().toString().padStart(2, '0')}/
            {d.getUTCFullYear()}
          </span>
        );
      },
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      width: 200,
      ellipsis: true,
      render: (val) =>
        val ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#d4870a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: '0.04em',
              textDecoration: 'none',
            }}
          >
            <EnvironmentOutlined style={{ fontSize: 13 }} />
            {val}
          </a>
        ) : (
          <span style={{ color: '#4a5060' }}>—</span>
        ),
    },
    {
      title: 'Job Type',
      dataIndex: 'job_type',
      key: 'job_type',
      width: 160,
      render: (val) =>
        val ? (
          <Tag
            style={{
              background: JOB_TYPE_COLORS[val] || '#2e3550',
              borderColor: 'transparent',
              color: '#f0ede8',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {val}
          </Tag>
        ) : (
          <span style={{ color: '#4a5060' }}>—</span>
        ),
    },
    ...(showStatus ? [{
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (val) => {
        const s = STATUS_STYLES[val];
        if (!s) return <span style={{ color: '#4a5060' }}>—</span>;
        return (
          <Tag style={{
            background: s.bg, borderColor: s.border, color: s.color,
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {s.label}
          </Tag>
        );
      },
    }] : []),
    {
      title: 'Project Manager',
      dataIndex: 'project_manager_name',
      key: 'project_manager_name',
      width: 150,
      render: (val) => (
        <span style={{ color: '#f0ede8' }}>{val || '—'}</span>
      ),
    },
    {
      title: 'Insurance',
      dataIndex: 'insurance_claim',
      key: 'insurance_claim',
      width: 100,
      align: 'center',
      render: (val) =>
        val ? (
          <CheckOutlined style={{ color: '#d4870a', fontSize: 14 }} />
        ) : (
          <CloseOutlined style={{ color: '#4a5060', fontSize: 14 }} />
        ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      render: (val) => (
        <span style={{ color: '#9aa0b4', fontSize: 13 }}>{val || '—'}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 110,
      render: (_, record) => (
        <Space size={6}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); onEdit(record); }}
            style={{
              background: 'rgba(212, 135, 10, 0.12)',
              borderColor: '#d4870a',
              color: '#d4870a',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.06em',
              borderRadius: 3,
              height: 28,
              padding: '0 8px',
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this job?"
            description="This action cannot be undone."
            onConfirm={(e) => { e?.stopPropagation(); onDelete(record.id); }}
            onCancel={(e) => e?.stopPropagation()}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{
              danger: true,
              style: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 },
            }}
          >
            <Button
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: '0.06em',
                borderRadius: 3,
                height: 28,
                padding: '0 8px',
              }}
            >
              Del
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

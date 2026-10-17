import React from 'react';
import { Button, Dropdown } from 'antd';
import { EditOutlined, MoreOutlined, TrophyOutlined, CloseOutlined, HolderOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function PipelineCard({ job, onEdit, onWon, onLost, onNoValue, dragHandleProps }) {
  const navigate = useNavigate();
  const days = daysSince(job.created_at);

  const menuItems = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => onEdit(job),
    },
    { type: 'divider' },
    {
      key: 'won',
      icon: <TrophyOutlined style={{ color: '#3db87a' }} />,
      label: <span style={{ color: '#3db87a' }}>Mark Won</span>,
      onClick: () => onWon(job),
    },
    {
      key: 'lost',
      icon: <CloseOutlined style={{ color: '#e05252' }} />,
      label: <span style={{ color: '#e05252' }}>Mark Lost</span>,
      onClick: () => onLost(job),
    },
    {
      key: 'no_value',
      icon: <CloseOutlined style={{ color: '#9aa0b4' }} />,
      label: <span style={{ color: '#9aa0b4' }}>No Value</span>,
      onClick: () => onNoValue(job),
    },
  ];

  return (
    <div
      style={{
        background: '#1e2436',
        border: '1px solid #2e3550',
        borderRadius: 5,
        padding: '10px 12px',
        marginBottom: 8,
        cursor: 'pointer',
      }}
      onClick={() => navigate(`/jobs/${job.id}`)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#f0ede8', letterSpacing: '0.04em', lineHeight: 1.2, flex: 1, minWidth: 0 }}>
          {job.job_name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              onClick={(e) => e.stopPropagation()}
              style={{ cursor: 'grab', padding: '2px 4px', color: '#4a5060', display: 'flex', alignItems: 'center', fontSize: 13 }}
            >
              <HolderOutlined />
            </div>
          )}
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
              style={{ color: '#9aa0b4', padding: '0 4px', height: 20, minWidth: 24, flexShrink: 0 }}
            />
          </Dropdown>
        </div>
      </div>

      {job.account_name && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#9aa0b4', marginTop: 4 }}>
          {job.account_name}
        </div>
      )}
      {job.address && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#4a5060', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.address}
        </div>
      )}
      {job.lead_source && (
        <div style={{ marginTop: 6 }}>
          <span style={{
            background: '#141826', border: '1px solid #2e3550', borderRadius: 3,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa0b4',
            padding: '1px 5px',
          }}>
            {job.lead_source}
          </span>
        </div>
      )}

      <div style={{ marginTop: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#4a5060' }}>
        {days === 0 ? 'today' : `${days}d ago`}
      </div>
    </div>
  );
}

export default PipelineCard;

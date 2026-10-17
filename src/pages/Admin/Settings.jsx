import React, { useEffect, useState } from 'react';
import { Button, message, Modal, Table } from 'antd';
import { CheckCircleOutlined, DisconnectOutlined, LinkOutlined, CloudDownloadOutlined, PlayCircleOutlined, UndoOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import client from '../../api/client.js';

const pageStyles = `
  .settings-page { padding: 32px; min-height: 100%; background: #141826; color: #f0ede8; }
  .settings-title { font-family: 'Barlow Condensed', sans-serif; font-size: 28px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #f0ede8; margin-bottom: 8px; line-height: 1; }
  .settings-title span { color: #d4870a; }
  .settings-subtitle { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #4a5060; margin-bottom: 32px; }
  .settings-card { background: #1e2436; border: 1px solid #2e3550; border-radius: 6px; padding: 24px 28px; margin-bottom: 20px; max-width: 640px; }
  .settings-section-title { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #d4870a; margin-bottom: 20px; }
  .backup-table .ant-table { background: transparent; }
  .backup-table .ant-table-thead > tr > th { background: #151b2c; color: #9aa0b4; border-color: #2e3550; font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 8px 12px; }
  .backup-table .ant-table-tbody > tr > td { background: transparent; border-color: #2e3550; color: #f0ede8; font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding: 8px 12px; }
  .backup-table .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,0.03) !important; }
  .backup-table .ant-table-tbody > tr > td { border-bottom: 1px solid #2e3550; }
`;

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [restoreTarget, setRestoreTarget] = useState(null);

  useEffect(() => {
    const qb = searchParams.get('qb');
    const msg = searchParams.get('msg');
    if (qb === 'connected') {
      message.success('QuickBooks connected successfully');
      queryClient.invalidateQueries({ queryKey: ['qb-status'] });
      setSearchParams({});
    } else if (qb === 'error') {
      message.error(`QuickBooks error: ${msg || 'unknown error'}`);
      setSearchParams({});
    }
  }, []);

  const { data: qbStatus } = useQuery({
    queryKey: ['qb-status'],
    queryFn: async () => { const { data } = await client.get('/settings/quickbooks/status'); return data; },
  });

  const qbConnectMutation = useMutation({
    mutationFn: async () => { const { data } = await client.get('/settings/quickbooks/connect'); return data; },
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to start QuickBooks connection'),
  });

  const qbDisconnectMutation = useMutation({
    mutationFn: async () => { await client.delete('/settings/quickbooks'); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['qb-status'] }); message.success('QuickBooks disconnected'); },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to disconnect'),
  });

  const { data: backups = [], isLoading: backupsLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => { const { data } = await client.get('/settings/backups'); return data; },
  });

  const runBackupMutation = useMutation({
    mutationFn: async () => { const { data } = await client.post('/settings/backups/run'); return data; },
    onSuccess: (data) => {
      message.success(data.message || 'Backup complete');
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (err) => message.error(err.response?.data?.error || 'Backup failed'),
  });

  const restoreMutation = useMutation({
    mutationFn: async (filename) => { const { data } = await client.post(`/settings/backups/restore/${filename}`); return data; },
    onSuccess: () => { message.success('Restore complete — page will reload'); setTimeout(() => window.location.reload(), 1500); },
    onError: (err) => message.error(err.response?.data?.error || 'Restore failed'),
    onSettled: () => setRestoreTarget(null),
  });

  const backupColumns = [
    {
      title: 'Date',
      dataIndex: 'filename',
      render: (f) => f.replace('backup-', '').replace('.sql', ''),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      render: (s) => fmtSize(s),
      width: 80,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      render: (d) => fmtDate(d),
      width: 190,
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="small"
            icon={<CloudDownloadOutlined />}
            onClick={() => window.open(`/api/settings/backups/download/${row.filename}`, '_blank')}
            style={{ background: 'rgba(212,135,10,0.1)', border: '1px solid #d4870a', color: '#d4870a', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }}
          >
            Download
          </Button>
          <Button
            size="small"
            icon={<UndoOutlined />}
            danger
            onClick={() => setRestoreTarget(row.filename)}
          >
            Restore
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <style>{pageStyles}</style>
      <div className="settings-page">
        <div className="settings-title">SETT<span>INGS</span></div>
        <div className="settings-subtitle">Application configuration — admin only</div>

        <div className="settings-card">
          <div className="settings-section-title">QuickBooks</div>
          <p style={{ color: '#9aa0b4', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, marginBottom: 20, marginTop: -12 }}>
            Connect to QuickBooks Online to sync invoices and accept payments from the customer portal.
          </p>
          {qbStatus?.connected ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, background: 'rgba(61,184,122,0.08)', border: '1px solid #3db87a', borderRadius: 4, padding: '10px 14px' }}>
                <CheckCircleOutlined style={{ color: '#3db87a', fontSize: 16 }} />
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, color: '#3db87a', letterSpacing: '0.06em' }}>CONNECTED</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#4a5060', marginTop: 2 }}>
                    Realm ID: {qbStatus.realm_id} · Connected {new Date(qbStatus.connected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <Button
                icon={<DisconnectOutlined />}
                loading={qbDisconnectMutation.isPending}
                onClick={() => qbDisconnectMutation.mutate()}
                danger
                style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.08em' }}
              >
                Disconnect QuickBooks
              </Button>
            </div>
          ) : (
            <Button
              icon={<LinkOutlined />}
              loading={qbConnectMutation.isPending}
              onClick={() => qbConnectMutation.mutate()}
              style={{ background: 'rgba(212,135,10,0.12)', border: '1px solid #d4870a', color: '#d4870a', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.08em' }}
            >
              Connect to QuickBooks
            </Button>
          )}
        </div>

        <div className="settings-card" style={{ maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="settings-section-title" style={{ marginBottom: 0 }}>Database Backups</div>
            <Button
              icon={<PlayCircleOutlined />}
              loading={runBackupMutation.isPending}
              onClick={() => runBackupMutation.mutate()}
              style={{ background: 'rgba(212,135,10,0.1)', border: '1px solid #d4870a', color: '#d4870a', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }}
            >
              Run Backup Now
            </Button>
          </div>
          <p style={{ color: '#9aa0b4', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, marginBottom: 16, marginTop: -12 }}>
            Daily backups run at 2am and are kept for 14 days. Download to save a copy off-server.
          </p>
          <Table
            className="backup-table"
            dataSource={backups}
            columns={backupColumns}
            rowKey="filename"
            loading={backupsLoading}
            pagination={false}
            size="small"
            locale={{ emptyText: <span style={{ color: '#4a5060', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}>No backups found</span> }}
          />
        </div>
      </div>

      <Modal
        open={!!restoreTarget}
        title={<span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.08em', fontSize: 16 }}>RESTORE DATABASE</span>}
        onCancel={() => setRestoreTarget(null)}
        footer={[
          <Button key="cancel" onClick={() => setRestoreTarget(null)}>Cancel</Button>,
          <Button
            key="restore"
            danger
            loading={restoreMutation.isPending}
            onClick={() => restoreMutation.mutate(restoreTarget)}
          >
            Yes, restore this backup
          </Button>,
        ]}
      >
        <p style={{ marginTop: 8 }}>
          This will overwrite all current data with <strong>{restoreTarget}</strong>.
        </p>
        <p style={{ color: '#b35000' }}>
          Any changes made after this backup was created will be lost. This cannot be undone.
        </p>
      </Modal>
    </>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Layout, Button, Space, Tooltip, Badge } from 'antd';
import { LogoutOutlined, BellOutlined, CheckOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import HelpModal from '../help/HelpModal.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../store/authStore.js';
import client from '../../api/client.js';

const { Header } = Layout;

const notifStyles = `
  .notif-dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: 360px; background: #141826; border: 1px solid #2e3550; border-radius: 6px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 9999; overflow: hidden; }
  .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid #2e3550; }
  .notif-header-title { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #9aa0b4; }
  .notif-mark-all { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #d4870a; background: none; border: none; cursor: pointer; padding: 0; }
  .notif-mark-all:hover { color: #f0a030; }
  .notif-list { max-height: 320px; overflow-y: auto; }
  .notif-item { padding: 10px 16px; border-bottom: 1px solid #1e2436; cursor: default; transition: background 0.1s; }
  .notif-item:hover { background: #1a2035; }
  .notif-item.unread { border-left: 3px solid #d4870a; background: rgba(212,135,10,0.04); }
  .notif-item.unread:hover { background: rgba(212,135,10,0.08); }
  .notif-item-text { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #f0ede8; line-height: 1.4; }
  .notif-item-time { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #4a5060; margin-top: 3px; }
  .notif-empty { padding: 24px 16px; text-align: center; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #4a5060; }
`;

const padJob = (n) => n ? `#${String(n).padStart(4, '0')}` : '';
const NOTIF_LABELS = {
  document_viewed:   (p) => `Customer viewed ${p.document_type}${p.job_number ? ` · JOB ${padJob(p.job_number)}` : ''} — ${p.job_name}`,
  document_approved: (p) => `${p.document_type} approved by customer${p.job_number ? ` · JOB ${padJob(p.job_number)}` : ''} — ${p.job_name}`,
  document_declined: (p) => `${p.document_type} declined${p.reason ? `: "${p.reason.slice(0,60)}"` : ''}${p.job_number ? ` · JOB ${padJob(p.job_number)}` : ''} — ${p.job_name}`,
};

function formatRelTime(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getPageTitle(pathname) {
  if (pathname.startsWith('/admin/settings')) return 'SETTINGS';
  if (pathname.startsWith('/jobs')) return 'JOBS';
  if (pathname.startsWith('/catalog')) return 'CATALOG';
  return 'SUMMIT';
}

function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [bellOpen, setBellOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const bellRef = useRef(null);

  const handleLogout = async () => {
    try { await client.post('/auth/logout'); } finally { sessionStorage.setItem('demo-logged-out', '1'); logout(); navigate('/login'); }
  };

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => { const { data } = await client.get('/notifications'); return data; },
    refetchInterval: 30000,
    enabled: !!user,
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unread || 0;

  const markReadMutation = useMutation({
    mutationFn: async (id) => { await client.put(`/notifications/${id}/read`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => { await client.put('/notifications/read-all'); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Close dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  const title = getPageTitle(location.pathname);

  return (
    <>
      <style>{notifStyles}</style>
      <Header
        style={{
          background: '#141826',
          borderBottom: '1px solid #2e3550',
          height: 56,
          lineHeight: '56px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '0.12em', color: '#f0ede8', textTransform: 'uppercase' }}>
          {title}
        </span>

        <Space size={12} align="center">
          {/* Help */}
          <Tooltip title="Help" placement="bottom">
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              onClick={() => setHelpOpen(true)}
              style={{ color: '#9aa0b4', width: 34, height: 34, border: '1px solid #2e3550', borderRadius: 4, background: '#1e2436', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#d4870a'; e.currentTarget.style.borderColor = '#d4870a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9aa0b4'; e.currentTarget.style.borderColor = '#2e3550'; }}
            />
          </Tooltip>

          {/* Notification Bell */}
          {user && (
            <div ref={bellRef} style={{ position: 'relative' }}>
              <Tooltip title="Notifications" placement="bottom">
                <Badge count={unreadCount} size="small" offset={[-2, 2]} styles={{ indicator: { background: '#d4870a', boxShadow: 'none', minWidth: 16, height: 16, lineHeight: '16px', fontSize: 10 } }}>
                  <Button
                    type="text"
                    icon={<BellOutlined />}
                    onClick={() => setBellOpen(v => !v)}
                    style={{ color: bellOpen ? '#d4870a' : '#9aa0b4', width: 34, height: 34, border: '1px solid #2e3550', borderRadius: 4, background: bellOpen ? '#1e2436' : '#1e2436', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                </Badge>
              </Tooltip>

              {bellOpen && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <span className="notif-header-title">Notifications</span>
                    {unreadCount > 0 && (
                      <button className="notif-mark-all" onClick={() => { markAllReadMutation.mutate(); }}>
                        <CheckOutlined style={{ fontSize: 10, marginRight: 4 }} />Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">No notifications</div>
                    ) : (
                      notifications.map((n) => {
                        const label = NOTIF_LABELS[n.type] ? NOTIF_LABELS[n.type](n.payload || {}) : n.type;
                        return (
                          <div
                            key={n.id}
                            className={`notif-item${!n.read ? ' unread' : ''}`}
                            onClick={() => { if (!n.read) markReadMutation.mutate(n.id); if (n.job_id) { setBellOpen(false); navigate(`/jobs/${n.job_id}`); } }}
                          >
                            <div className="notif-item-text">{label}</div>
                            <div className="notif-item-time">{formatRelTime(n.created_at)}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User chip */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', background: '#1e2436', border: '1px solid #2e3550', borderRadius: 4, padding: '4px 12px', height: 34 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#f0ede8', fontWeight: 500, lineHeight: 1 }}>
                {user.name}
              </span>
            </div>
          )}

          <Tooltip title="Logout" placement="bottom">
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ color: '#9aa0b4', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, border: '1px solid #2e3550', borderRadius: 4, background: '#1e2436', padding: 0, transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4d4f'; e.currentTarget.style.borderColor = '#ff4d4f'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9aa0b4'; e.currentTarget.style.borderColor = '#2e3550'; }}
            />
          </Tooltip>
        </Space>
      </Header>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

export default TopBar;

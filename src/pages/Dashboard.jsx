import React, { useEffect } from 'react';
import { Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import client from '../api/client.js';

// Leaflet default-icon fix for Vite (same pattern as LocationPicker.jsx)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl:       new URL('leaflet/dist/images/marker-icon.png',    import.meta.url).href,
  shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png',  import.meta.url).href,
});

const PIPELINE_STATUSES = new Set([
  'new_lead', 'inspection_scheduled', 'inspected',
  'bid_in_progress', 'bid_sent', 'follow_up',
]);

function makeMarkerIcon(status) {
  const color = PIPELINE_STATUSES.has(status) ? '#d4870a' : '#3db87a';
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid rgba(255,255,255,0.7);box-shadow:0 1px 4px rgba(0,0,0,0.45)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function FitBoundsOnLoad({ pins }) {
  const map = useMap();
  useEffect(() => {
    if (!pins.length) return;
    if (pins.length === 1) {
      map.setView([pins[0].latF, pins[0].lngF], 14);
    } else {
      const bounds = L.latLngBounds(pins.map(p => [p.latF, p.lngF]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
    }
  }, [pins.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function DashboardMap({ pins, navigate }) {
  if (pins.length === 0) {
    return (
      <div style={{
        height: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#4a5060',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        border: '1px dashed #2e3550',
        borderRadius: 6,
      }}>
        No mapped locations yet — set an address with coordinates on a job to see it here.
      </div>
    );
  }

  return (
    <div style={{ height: 300, borderRadius: 6, overflow: 'hidden', border: '1px solid #2e3550' }}>
      <MapContainer
        center={[31.5, -99.0]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        zoomControl
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBoundsOnLoad pins={pins} />
        {pins.map(pin => (
          <Marker
            key={pin.id}
            position={[pin.latF, pin.lngF]}
            icon={makeMarkerIcon(pin.status)}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.5, minWidth: 150, maxWidth: 210 }}>
                {pin.job_number && (
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9aa0b4', marginBottom: 2 }}>
                    JOB #{pin.job_number}
                  </div>
                )}
                <div style={{ fontWeight: 600, color: '#1a1a2e', marginBottom: pin.address ? 2 : 6 }}>
                  {pin.job_name}
                </div>
                {pin.address && (
                  <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 6 }}>{pin.address}</div>
                )}
                <button
                  onClick={() => navigate('/jobs/' + pin.id)}
                  style={{
                    background: '#d4870a', border: 'none', borderRadius: 3,
                    color: '#fff', fontSize: 12, fontWeight: 600,
                    padding: '4px 10px', cursor: 'pointer',
                  }}
                >
                  View Job →
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

const styles = `
  .dash-page { padding: 24px 28px; max-width: 900px; }
  .dash-title { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #4a5060; margin-bottom: 20px; }
  .dash-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
  @media (max-width: 700px) { .dash-stats { grid-template-columns: repeat(2, 1fr); } }
  .dash-stat { background: #0f1320; border: 1px solid #2e3550; border-radius: 6px; padding: 16px 18px; }
  .dash-stat-val { font-family: 'Barlow Condensed', sans-serif; font-size: 30px; font-weight: 700; color: #f0ede8; line-height: 1; }
  .dash-stat-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #4a5060; margin-top: 6px; letter-spacing: .05em; }
  .dash-stat.accent .dash-stat-val { color: #d4870a; }
  .dash-section-title { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #4a5060; margin-bottom: 12px; }
  .dash-feed { display: flex; flex-direction: column; gap: 1px; }
  .dash-event { display: flex; align-items: flex-start; gap: 12px; padding: 11px 14px; background: #0f1320; border-radius: 4px; }
  .dash-event:hover { background: #141826; }
  .dash-event-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
  .dash-event-body { flex: 1; min-width: 0; }
  .dash-event-text { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #c8c4be; line-height: 1.5; }
  .dash-event-text .job-link { color: #d4870a; cursor: pointer; text-decoration: none; }
  .dash-event-text .job-link:hover { text-decoration: underline; }
  .dash-event-meta { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #4a5060; margin-top: 3px; }
  .dash-empty { color: #4a5060; font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding: 32px 0; text-align: center; }
`;

const EVENT_COLORS = {
  job_created:       '#22c55e',
  expense_added:     '#d4870a',
  document_created:  '#3b82f6',
  document_approved: '#22c55e',
  document_declined: '#ef4444',
  document_voided:   '#6b7280',
};

function eventLabel(ev) {
  const p = ev.payload || {};
  const job = ev.job_name
    ? `JOB #${ev.job_number_fmt || ev.job_number || '?'} — ${ev.job_name}`
    : null;

  switch (ev.type) {
    case 'job_created':
      return { text: `New job created`, job };
    case 'expense_added': {
      const amt = p.amount != null ? `$${Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
      const vendor = p.vendor ? ` · ${p.vendor}` : '';
      return { text: `Expense logged${amt ? ` — ${amt}` : ''}${vendor}`, job };
    }
    case 'document_created':
      return { text: `${p.doc_type || 'Document'} created${p.title ? ` — ${p.title}` : ''}`, job };
    case 'document_approved':
      return { text: `${p.doc_type || 'Document'} approved by customer${p.account_name ? ` (${p.account_name})` : ''}`, job };
    case 'document_declined':
      return { text: `${p.doc_type || 'Document'} declined${p.reason ? ` — "${p.reason}"` : ''}`, job };
    case 'document_voided':
      return { text: `${p.doc_type || 'Document'} voided${p.title ? ` — ${p.title}` : ''}`, job };
    default:
      return { text: ev.type.replace(/_/g, ' '), job };
  }
}

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400 && d.getDate() === now.getDate())
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmt$(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const MAP_STATUSES = [
  'new_lead', 'inspection_scheduled', 'inspected',
  'bid_in_progress', 'bid_sent', 'follow_up',
  'active', 'pending_permit',
].join(',');

export default function Dashboard() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => { const { data } = await client.get('/dashboard'); return data; },
    refetchInterval: 30000,
  });

  const { data: mapJobs = [] } = useQuery({
    queryKey: ['dashboard-map-jobs'],
    queryFn: async () => {
      const { data } = await client.get(`/jobs?status=${MAP_STATUSES}`);
      return data;
    },
    staleTime: 60000,
  });

  const mapPins = mapJobs
    .filter(j => j.lat && j.lng)
    .map(j => ({
      id: j.id,
      job_name: j.job_name,
      job_number: j.job_number,
      address: j.address,
      status: j.status,
      latF: parseFloat(j.lat),
      lngF: parseFloat(j.lng),
    }))
    .filter(p => !isNaN(p.latF) && !isNaN(p.lngF));

  const stats = data?.stats || {};
  const activity = data?.activity || [];

  return (
    <>
      <style>{styles}</style>
      <div className="dash-page">
        <div className="dash-title">Dashboard</div>

        {isLoading ? (
          <div style={{ paddingTop: 60, textAlign: 'center' }}><Spin /></div>
        ) : (
          <>
            <div className="dash-stats">
              <div className="dash-stat">
                <div className="dash-stat-val">{stats.total_jobs ?? '—'}</div>
                <div className="dash-stat-label">Total Jobs</div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-val" style={{ color: stats.pending_documents > 0 ? '#d4870a' : undefined }}>{stats.pending_documents ?? '—'}</div>
                <div className="dash-stat-label">Pending Approval</div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-val" style={{ color: stats.open_invoices > 0 ? '#ef4444' : undefined }}>{stats.open_invoices ?? '—'}</div>
                <div className="dash-stat-label">Open Invoices</div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-val" style={{ color: stats.paid_invoices_30d > 0 ? '#3db87a' : undefined }}>{stats.paid_invoices_30d ?? '—'}</div>
                <div className="dash-stat-label">Paid Invoices (30d)</div>
              </div>
              <div className="dash-stat accent">
                <div className="dash-stat-val">{stats.approved_expenses != null ? fmt$(stats.approved_expenses) : '—'}</div>
                <div className="dash-stat-label">Approved Expenses</div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-val" style={{ color: stats.upcoming_appointments > 0 ? '#d4870a' : undefined }}>{stats.upcoming_appointments ?? '—'}</div>
                <div className="dash-stat-label">Appointments (7d)</div>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div className="dash-section-title">Job Locations</div>
              <DashboardMap pins={mapPins} navigate={navigate} />
            </div>

            <div className="dash-section-title">Recent Activity</div>
            {activity.length === 0 ? (
              <div className="dash-empty">No activity yet — actions you take will appear here.</div>
            ) : (
              <div className="dash-feed">
                {activity.map(ev => {
                  const { text, job } = eventLabel(ev);
                  const color = EVENT_COLORS[ev.type] || '#4a5060';
                  return (
                    <div key={ev.id} className="dash-event">
                      <div className="dash-event-dot" style={{ background: color }} />
                      <div className="dash-event-body">
                        <div className="dash-event-text">
                          {text}
                          {job && ev.job_id && (
                            <>
                              {' — '}
                              <span
                                className="job-link"
                                onClick={() => navigate(`/jobs/${ev.job_id}`)}
                              >
                                {job}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="dash-event-meta">
                          {ev.user_name && <span>{ev.user_name} · </span>}
                          {formatTime(ev.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

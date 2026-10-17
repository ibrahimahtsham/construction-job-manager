import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Input, Spin, message } from 'antd';
import { FilePdfOutlined, CheckOutlined, CloseOutlined, DownloadOutlined, FileOutlined } from '@ant-design/icons';
import SignatureCanvas from 'react-signature-canvas';
import axios from 'axios';
import mockAdapter from '../demo/mockAdapter.js';

const api = axios.create({ baseURL: '/api', adapter: mockAdapter });

const portalStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1122; }
  .portal-page { min-height: 100vh; background: #0d1122; color: #f0ede8; font-family: 'system-ui', sans-serif; }
  .portal-header { background: #0f1320; border-bottom: 3px solid #d4870a; padding: 20px 32px; }
  .portal-logo { font-family: 'Georgia', serif; font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #d4870a; }
  .portal-logo-sub { font-size: 11px; color: #4a5060; letter-spacing: 2px; margin-top: 2px; }
  .portal-body { max-width: 800px; margin: 0 auto; padding: 32px 24px; }
  .portal-doc-header { background: #141826; border: 1px solid #2e3550; border-radius: 6px; padding: 20px 24px; margin-bottom: 20px; }
  .portal-doc-type { font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #f0ede8; text-transform: uppercase; margin-bottom: 8px; }
  .portal-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-top: 14px; }
  .portal-meta-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #4a5060; margin-bottom: 3px; }
  .portal-meta-value { font-family: monospace; font-size: 13px; color: #f0ede8; }
  .portal-section { background: #141826; border: 1px solid #2e3550; border-radius: 6px; padding: 20px 24px; margin-bottom: 20px; }
  .portal-section-title { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #4a5060; border-bottom: 1px solid #252c42; padding-bottom: 6px; margin-bottom: 16px; }
  .portal-table { width: 100%; border-collapse: collapse; font-family: monospace; font-size: 12px; }
  .portal-table th { background: #0f1320; color: #9aa0b4; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 8px 10px; text-align: left; border-bottom: 1px solid #2e3550; }
  .portal-table th.r { text-align: right; }
  .portal-table td { padding: 8px 10px; border-bottom: 1px solid #1a2236; color: #f0ede8; }
  .portal-table td.r { text-align: right; }
  .portal-table tr.group-row td { background: #1a2035; color: #d4870a; font-weight: 700; font-size: 13px; letter-spacing: 1px; border-top: 1px solid #2e3550; }
  .portal-table td.indent-cell { border-left: 2px solid rgba(212,135,10,0.35); }
  .portal-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; align-items: center; }
  .portal-btn { padding: 10px 24px; border-radius: 4px; border: none; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
  .portal-btn-approve { background: #3db87a; color: #fff; }
  .portal-btn-approve:hover { background: #34a36b; }
  .portal-btn-decline { background: transparent; color: #e85555; border: 1px solid #e85555; }
  .portal-btn-decline:hover { background: rgba(232,85,85,0.08); }
  .portal-btn-pdf { background: transparent; color: #9aa0b4; border: 1px solid #2e3550; }
  .portal-btn-pdf:hover { border-color: #9aa0b4; color: #f0ede8; }
  .portal-status-badge { display: inline-block; padding: 4px 14px; border-radius: 3px; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
  .portal-msg { background: #0f1320; border-radius: 4px; padding: 10px 14px; margin-bottom: 8px; }
  .portal-msg-meta { font-size: 10px; color: #4a5060; margin-bottom: 4px; letter-spacing: 1px; }
  .portal-msg-meta span { font-weight: 700; color: #9aa0b4; }
  .portal-msg-body { font-family: monospace; font-size: 13px; color: #f0ede8; white-space: pre-wrap; }
  .portal-msg-customer .portal-msg-meta span { color: #d4870a; }
  .portal-sig-area { background: #fff; border-radius: 4px; margin-bottom: 12px; cursor: crosshair; display: block; }
  .portal-error { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 16px; text-align: center; }
  .portal-error-code { font-size: 64px; font-weight: 700; color: #2e3550; }
  .portal-error-msg { font-size: 18px; color: #9aa0b4; max-width: 360px; }
`;

const fmt$ = (v) => (v == null ? '—' : `$${Number(v).toFixed(2)}`);

const STATUS_STYLES = {
  draft:    { color: '#9aa0b4', background: 'rgba(154,160,180,0.1)', border: '1px solid #2e3550' },
  pending:  { color: '#d4870a', background: 'rgba(212,135,10,0.1)',  border: '1px solid #d4870a' },
  approved: { color: '#3db87a', background: 'rgba(61,184,122,0.1)',  border: '1px solid #3db87a' },
  declined: { color: '#e85555', background: 'rgba(232,85,85,0.1)',   border: '1px solid #e85555' },
  void:     { color: '#4a5060', background: 'rgba(74,80,96,0.1)',    border: '1px solid #4a5060' },
};

function buildTree(flat, parentId = null) {
  return flat.filter(e => (e.parent_id ?? null) === parentId).sort((a, b) => a.sort_order - b.sort_order).map(e => ({ ...e, children: buildTree(flat, e.budget_entry_id) }));
}
function flattenWithDepth(nodes, depth = 0) {
  const result = [];
  for (const node of nodes) {
    result.push({ ...node, _depth: depth });
    if (node.children?.length) result.push(...flattenWithDepth(node.children, depth + 1));
  }
  return result;
}
function sumGroupPrice(node) {
  if (node.entry_type !== 'group') return Number(node.ext_price) || 0;
  return (node.children || []).reduce((acc, c) => {
    if (c.entry_type === 'group' && c.visible === false) return acc;
    return acc + sumGroupPrice(c);
  }, 0);
}

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return `${(d.getUTCMonth()+1).toString().padStart(2,'0')}/${d.getUTCDate().toString().padStart(2,'0')}/${d.getUTCFullYear()}`;
}

function formatDateTime(val) {
  if (!val) return '';
  const d = new Date(val);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Portal() {
  const { token } = useParams();
  const qc = useQueryClient();
  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const sigRef = useRef(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', token],
    queryFn: async () => {
      const { data } = await api.get(`/portal/${token}`);
      return data;
    },
    retry: false,
  });

  const refreshPortal = () => qc.invalidateQueries({ queryKey: ['portal', token] });

  const downloadPDF = async () => {
    try {
      const response = await api.get(`/portal/${token}/pdf`, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      const cd = response.headers['content-disposition'];
      a.download = cd?.match(/filename="(.+)"/)?.[1] || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      message.error('Failed to download PDF');
    }
  };

  const handleApprove = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      message.warning('Please draw your signature before approving');
      return;
    }
    const signature = sigRef.current.toDataURL('image/png');
    setSubmitting(true);
    try {
      await api.post(`/portal/${token}/approve`, { signature });
      message.success('Document approved — thank you!');
      setApproveOpen(false);
      refreshPortal();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      await api.post(`/portal/${token}/decline`, { reason: declineReason || null });
      message.info('Document declined');
      setDeclineOpen(false);
      setDeclineReason('');
      refreshPortal();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to decline');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPortalFile = async (file) => {
    try {
      const res = await api.get(`/portal/${token}/files/${file.id}/download`, { responseType: 'blob' });
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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0d1122' }}>
        <Spin size="large" />
      </div>
    );
  }

  const errMsg = error?.response?.data?.error || error?.message;
  const errStatus = error?.response?.status;

  if (error) {
    return (
      <>
        <style>{portalStyles}</style>
        <div className="portal-page">
          <div className="portal-header">
            <div className="portal-logo">SUMMIT</div>
            <div className="portal-logo-sub">FOUNDATION &amp; CONSTRUCTION</div>
          </div>
          <div className="portal-error">
            <div className="portal-error-code">{errStatus || '?'}</div>
            <div className="portal-error-msg">{errMsg || 'This link is invalid or has expired.'}</div>
          </div>
        </div>
      </>
    );
  }

  const { document: doc, line_items = [], files = [] } = data;
  const statusStyle = STATUS_STYLES[doc.status] || STATUS_STYLES.draft;
  const isOrder   = doc.category === 'Customer Order';
  const isInvoice = doc.category === 'Customer Invoice';
  const canAct    = isOrder && ['draft', 'pending'].includes(doc.status);

  // Build flat line items with depth
  const flatItems = flattenWithDepth(buildTree(line_items.map(li => ({ ...li, type: li.entry_type }))));
  // Filter out hidden rows
  const visibleItems = flatItems.filter(li => li.visible !== false);

  return (
    <>
      <style>{portalStyles}</style>
      <div className="portal-page">
        <div className="portal-header">
          <div className="portal-logo">SUMMIT</div>
          <div className="portal-logo-sub">FOUNDATION &amp; CONSTRUCTION</div>
        </div>

        <div className="portal-body">
          {/* Document header */}
          <div className="portal-doc-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div className="portal-doc-type">{doc.title || doc.type}</div>
              <span className="portal-status-badge" style={statusStyle}>{doc.status}</span>
            </div>
            <div className="portal-meta">
              <div>
                <div className="portal-meta-label">Job</div>
                <div className="portal-meta-value">{doc.job_name}</div>
              </div>
              <div>
                <div className="portal-meta-label">Account</div>
                <div className="portal-meta-value">{doc.account_name || '—'}</div>
              </div>
              {doc.address && (
                <div>
                  <div className="portal-meta-label">Address</div>
                  <div className="portal-meta-value">{doc.address}</div>
                </div>
              )}
              {doc.expiry_date && (
                <div>
                  <div className="portal-meta-label">Valid Until</div>
                  <div className="portal-meta-value" style={{ color: new Date(doc.expiry_date) < new Date() ? '#e85555' : '#f0ede8' }}>{formatDate(doc.expiry_date)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Order: Approve & Sign / Decline (pending/draft only) */}
          {canAct && (
            <div className="portal-actions">
              <button className="portal-btn portal-btn-approve" onClick={() => setApproveOpen(true)}>
                <CheckOutlined /> Approve &amp; Sign
              </button>
              <button className="portal-btn portal-btn-decline" onClick={() => setDeclineOpen(true)}>
                <CloseOutlined /> Decline
              </button>
              <button className="portal-btn portal-btn-pdf" onClick={() => downloadPDF()}>
                <FilePdfOutlined /> Download PDF
              </button>
            </div>
          )}

          {/* Customer Order: approved banner */}
          {isOrder && doc.status === 'approved' && (
            <div style={{ background: 'rgba(61,184,122,0.08)', border: '1px solid #3db87a', borderRadius: 6, padding: '12px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ color: '#3db87a', fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>APPROVED</div>
                {doc.customer_signed_at && <div style={{ color: '#9aa0b4', fontSize: 12, marginTop: 4 }}>{formatDateTime(doc.customer_signed_at)}</div>}
              </div>
              <button className="portal-btn portal-btn-pdf" onClick={() => downloadPDF()}>
                <FilePdfOutlined /> Download PDF
              </button>
            </div>
          )}

          {/* Customer Invoice: pay / paid / download */}
          {isInvoice && (
            <div style={{ background: 'rgba(61,184,122,0.08)', border: '1px solid #3db87a', borderRadius: 6, padding: '12px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                {doc.paid_at ? (
                  <span style={{ color: '#3db87a', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.08em' }}>
                    PAID — {formatDateTime(doc.paid_at)}
                  </span>
                ) : (
                  <span style={{ color: '#9aa0b4', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}>Payment due</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {doc.qb_payment_url && !doc.paid_at && (
                  <a href={doc.qb_payment_url} target="_blank" rel="noopener noreferrer">
                    <button className="portal-btn" style={{ background: 'rgba(61,184,122,0.15)', border: '1px solid #3db87a', color: '#3db87a' }}>
                      Pay Now
                    </button>
                  </a>
                )}
                <button className="portal-btn portal-btn-pdf" onClick={() => downloadPDF()}>
                  <FilePdfOutlined /> Download PDF
                </button>
              </div>
            </div>
          )}

          {isOrder && doc.status === 'declined' && (
            <div style={{ background: 'rgba(232,85,85,0.08)', border: '1px solid #e85555', borderRadius: 6, padding: '12px 20px', marginBottom: 20 }}>
              <div style={{ color: '#e85555', fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>DECLINED</div>
              {doc.declined_at && <div style={{ color: '#9aa0b4', fontSize: 12, marginTop: 4 }}>{formatDateTime(doc.declined_at)}</div>}
            </div>
          )}

          {/* Line items */}
          {visibleItems.length > 0 && (
            <div className="portal-section">
              <div className="portal-section-title">Line Items</div>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    {!doc.hide_quantities && <th className="r" style={{ width: 60 }}>Qty</th>}
                    {!doc.hide_quantities && <th style={{ width: 60 }}>Unit</th>}
                    {!doc.hide_prices && <th className="r" style={{ width: 110 }}>Price</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((li) => {
                    const vc = li.visible_cells || {};
                    if (li.entry_type === 'group') {
                      return (
                        <tr key={li.id} className="group-row">
                          <td className={li._depth > 0 ? 'indent-cell' : ''} style={{ paddingLeft: li._depth * 16 + 10 }}>{li.name || '—'}</td>
                          {!doc.hide_quantities && <td />}
                          {!doc.hide_quantities && <td />}
                          {!doc.hide_prices && (
                            <td className="r"><strong>{fmt$(sumGroupPrice(li))}</strong></td>
                          )}
                        </tr>
                      );
                    }
                    return (
                      <tr key={li.id}>
                        <td className={li._depth > 0 ? 'indent-cell' : ''} style={{ paddingLeft: li._depth * 16 + 10 }}>
                          <div>{li.name || <span style={{ color: '#4a5060' }}>—</span>}</div>
                          {li.description && <div style={{ color: '#6a7290', fontSize: 11, marginTop: 2 }}>{li.description}</div>}
                        </td>
                        {!doc.hide_quantities && <td className="r">{li.quantity ?? '—'}</td>}
                        {!doc.hide_quantities && <td>{li.unit || '—'}</td>}
                        {!doc.hide_prices && (
                          <td className="r">{vc.ext_price === false ? <span style={{ color: '#4a5060' }}>—</span> : fmt$(li.ext_price)}</td>
                        )}
                      </tr>
                    );
                  })}
                  {/* Grand total / tax rows */}
                  {(() => {
                    const subtotal = flatItems.filter(li => li.entry_type !== 'group' && li.visible !== false).reduce((s, li) => s + (Number(li.ext_price) || 0), 0);
                    const taxRate = Number(doc.tax_rate) || 0;
                    const taxAmt = subtotal * (taxRate / 100);
                    const grandTotal = subtotal + taxAmt;
                    const colCount = 1 + (!doc.hide_quantities ? 2 : 0) + (!doc.hide_prices ? 1 : 0);
                    const totalTd = (label, amount, amber) => (
                      <>
                        <td colSpan={colCount - 1} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', color: amber ? '#d4870a' : '#9aa0b4', paddingTop: 8, textAlign: 'right' }}>{label}</td>
                        <td className="r" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: amber ? 13 : 11, color: amber ? '#d4870a' : '#9aa0b4', paddingTop: 8 }}>{fmt$(amount)}</td>
                      </>
                    );
                    return (
                      <>
                        {taxRate > 0 && (
                          <>
                            <tr style={{ borderTop: '1px solid #2e3550' }}>{totalTd('SUBTOTAL', subtotal, false)}</tr>
                            <tr>{totalTd(`TAX (${taxRate.toFixed(2)}%)`, taxAmt, false)}</tr>
                            <tr style={{ borderTop: '1px solid #2e3550' }}>{totalTd('TOTAL', grandTotal, true)}</tr>
                          </>
                        )}
                        {taxRate === 0 && (
                          <tr style={{ borderTop: '1px solid #2e3550' }}>{totalTd('TOTAL', subtotal, true)}</tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div className="portal-section">
              <div className="portal-section-title">Files</div>
              {files.map((f) => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1a2236' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#f0ede8', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileOutlined style={{ color: '#4a5060' }} />
                    {f.original_name}
                    <span style={{ color: '#4a5060', fontSize: 11 }}>
                      {f.size ? (f.size < 1048576 ? `${(f.size / 1024).toFixed(1)} KB` : `${(f.size / 1048576).toFixed(1)} MB`) : ''}
                    </span>
                  </span>
                  <button
                    className="portal-btn portal-btn-pdf"
                    style={{ padding: '5px 14px', fontSize: 12 }}
                    onClick={() => downloadPortalFile(f)}
                  >
                    <DownloadOutlined /> Download
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Approve + Signature Modal */}
      <Modal
        open={approveOpen}
        title={<span style={{ fontFamily: 'Georgia,serif', letterSpacing: 2, color: '#f0ede8' }}>APPROVE DOCUMENT</span>}
        onCancel={() => setApproveOpen(false)}
        footer={[
          <Button key="clear" onClick={() => sigRef.current?.clear()} style={{ background: 'transparent', border: '1px solid #2e3550', color: '#9aa0b4' }}>Clear</Button>,
          <Button key="cancel" onClick={() => setApproveOpen(false)}>Cancel</Button>,
          <Button key="approve" type="primary" loading={submitting} onClick={handleApprove} style={{ background: '#3db87a', borderColor: '#3db87a' }}>Approve &amp; Sign</Button>,
        ]}
        width={520}
        styles={{ body: { background: '#141826', paddingTop: 16 }, header: { background: '#141826', borderBottom: '1px solid #2e3550' }, footer: { background: '#141826', borderTop: '1px solid #2e3550' }, content: { background: '#141826', border: '1px solid #2e3550' } }}
        destroyOnHidden
      >
        <p style={{ color: '#9aa0b4', fontFamily: 'monospace', fontSize: 12, marginBottom: 12 }}>
          By signing below, you approve this {doc.type} and agree to its terms.
        </p>
        <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #2e3550', overflow: 'hidden' }}>
          <SignatureCanvas
            ref={sigRef}
            penColor="#0d1122"
            canvasProps={{ width: 468, height: 180, className: 'portal-sig-area' }}
          />
        </div>
        <p style={{ color: '#4a5060', fontFamily: 'monospace', fontSize: 11, marginTop: 8 }}>Draw your signature above</p>
      </Modal>

      {/* Decline Modal */}
      <Modal
        open={declineOpen}
        title={<span style={{ fontFamily: 'Georgia,serif', letterSpacing: 2, color: '#f0ede8' }}>DECLINE DOCUMENT</span>}
        onCancel={() => { setDeclineOpen(false); setDeclineReason(''); }}
        footer={[
          <Button key="cancel" onClick={() => { setDeclineOpen(false); setDeclineReason(''); }}>Cancel</Button>,
          <Button key="decline" danger loading={submitting} onClick={handleDecline}>Decline Document</Button>,
        ]}
        width={440}
        styles={{ body: { background: '#141826', paddingTop: 16 }, header: { background: '#141826', borderBottom: '1px solid #2e3550' }, footer: { background: '#141826', borderTop: '1px solid #2e3550' }, content: { background: '#141826', border: '1px solid #2e3550' } }}
        destroyOnHidden
      >
        <p style={{ color: '#9aa0b4', fontFamily: 'monospace', fontSize: 12, marginBottom: 12 }}>
          Optionally provide a reason for declining this document.
        </p>
        <textarea
          value={declineReason}
          onChange={e => setDeclineReason(e.target.value)}
          placeholder="Reason for declining (optional)..."
          rows={4}
          style={{ width: '100%', background: '#0f1320', border: '1px solid #2e3550', borderRadius: 4, color: '#f0ede8', fontFamily: 'monospace', fontSize: 12, padding: '8px 10px', resize: 'vertical', outline: 'none' }}
        />
      </Modal>
    </>
  );
}

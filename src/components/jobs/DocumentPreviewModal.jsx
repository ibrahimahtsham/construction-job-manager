import React, { useMemo } from 'react';
import { Modal, Spin, Tooltip, message } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

const previewStyles = `
  .dp-section { background: #141826; border: 1px solid #2e3550; border-radius: 6px; padding: 20px 24px; margin-bottom: 16px; }
  .dp-section-title { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #4a5060; border-bottom: 1px solid #252c42; padding-bottom: 6px; margin-bottom: 14px; }
  .dp-table { width: 100%; border-collapse: collapse; font-family: monospace; font-size: 12px; }
  .dp-table th { background: #0f1320; color: #9aa0b4; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 7px 10px; text-align: left; border-bottom: 1px solid #2e3550; }
  .dp-table th.r { text-align: right; }
  .dp-table td { padding: 7px 10px; border-bottom: 1px solid #1a2236; color: #f0ede8; vertical-align: middle; }
  .dp-table td.r { text-align: right; }
  .dp-table tr.hidden-row td { opacity: 0.35; }
  .dp-table tr.group-row td { background: #1a2035; color: #d4870a; font-weight: 700; font-size: 13px; letter-spacing: 1px; }
  .dp-table tr.group-row td { border-top: 1px solid #2e3550; }
  .dp-table td.indent-cell { border-left: 2px solid rgba(212,135,10,0.35); }
  .dp-table tr.group-row.hidden-row td { background: #1a2035; opacity: 0.35; }
  .dp-eye-btn { background: none; border: none; cursor: pointer; padding: 2px 4px; color: #4a5060; line-height: 1; border-radius: 3px; }
  .dp-eye-btn:hover { color: #d4870a; background: rgba(212,135,10,0.1); }
  .dp-eye-btn.visible { color: #9aa0b4; }
`;

const fmt$ = (v) => (v == null ? '—' : `$${Number(v).toFixed(2)}`);

function sumGroupPrice(node) {
  if (node.type !== 'group') return Number(node.ext_price) || 0;
  return (node.children || []).reduce((acc, c) => {
    if (c.type === 'group' && c.visible === false) return acc;
    return acc + sumGroupPrice(c);
  }, 0);
}
function sumGroupCost(node) {
  if (node.type !== 'group') return Number(node.ext_cost) || 0;
  return (node.children || []).reduce((acc, c) => {
    if (c.type === 'group' && c.visible === false) return acc;
    return acc + sumGroupCost(c);
  }, 0);
}

function buildTree(flat, parentId = null) {
  return flat
    .filter(e => (e.parent_id ?? null) === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(e => ({ ...e, children: buildTree(flat, e.budget_entry_id) }));
}
function flattenWithDepth(nodes, depth = 0) {
  const result = [];
  for (const node of nodes) {
    result.push({ ...node, _depth: depth });
    if (node.children?.length) result.push(...flattenWithDepth(node.children, depth + 1));
  }
  return result;
}

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return `${(d.getUTCMonth()+1).toString().padStart(2,'0')}/${d.getUTCDate().toString().padStart(2,'0')}/${d.getUTCFullYear()}`;
}

export default function DocumentPreviewModal({ jobId, docId, open, onClose }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['doc-preview', jobId, docId],
    queryFn: async () => {
      const { data } = await client.get(`/jobs/${jobId}/documents/${docId}`);
      return data;
    },
    enabled: open && !!docId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ entryId, visible }) => {
      await client.put(`/jobs/${jobId}/budget/${entryId}`, { visible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-preview', jobId, docId] });
      queryClient.invalidateQueries({ queryKey: ['budget', jobId] });
      queryClient.invalidateQueries({ queryKey: ['documents', jobId] });
    },
    onError: (err) => message.error(err.response?.data?.error || 'Failed to update'),
  });

  const flatItems = useMemo(() => {
    if (!data?.line_items?.length) return [];
    return flattenWithDepth(buildTree(data.line_items));
  }, [data]);

  const doc = data;
  const hideP = doc?.hide_prices;
  const hideQ = doc?.hide_quantities;

  const isCustomerDoc = doc && ['Customer Order', 'Customer Invoice'].includes(doc.category);

  // Grand total: root-level entries only (depth=0) to avoid double-counting.
  // Visible groups → sumGroupPrice (counts all items inside, ignoring per-item visibility).
  // Hidden groups → excluded. Root items → count only if visible.
  const grandTotal = flatItems
    .filter(li => li._depth === 0 && li.visible !== false)
    .reduce((s, li) => s + (li.type === 'group' ? sumGroupPrice(li) : (Number(li.ext_price) || 0)), 0);

  return (
    <>
      <style>{previewStyles}</style>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={820}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: '0.1em', color: '#f0ede8' }}>
              CUSTOMER PREVIEW — {doc?.type || ''}
            </span>
            <span style={{ background: 'rgba(212,135,10,0.15)', border: '1px solid #d4870a', borderRadius: 3, padding: '2px 8px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#d4870a' }}>
              STAFF ONLY
            </span>
          </div>
        }
        styles={{
          content: { background: '#0d1122', border: '1px solid #2e3550' },
          header: { background: '#0d1122', borderBottom: '1px solid #2e3550' },
          body: { background: '#0d1122', maxHeight: '75vh', overflowY: 'auto', padding: '16px 24px' },
        }}
        destroyOnHidden
      >
        {isLoading || !doc ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <>
            {/* Header info */}
            <div className="dp-section" style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                {[
                  ['Document', doc.title || doc.type],
                  ['Job', doc.job_name || '—'],
                  ['Expiry', doc.expiry_date ? formatDate(doc.expiry_date) : 'None'],
                  ['Status', doc.status],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#4a5060', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#f0ede8' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Eye toggle legend */}
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#4a5060', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <EyeOutlined style={{ color: '#9aa0b4' }} /> = visible to customer &nbsp;·&nbsp;
              <EyeInvisibleOutlined style={{ color: '#4a5060' }} /> = hidden &nbsp;·&nbsp;
              click eye to toggle
            </div>

            {/* Line items */}
            {flatItems.length > 0 && (
              <div className="dp-section">
                <div className="dp-section-title">Line Items</div>
                <table className="dp-table">
                  <thead>
                    <tr>
                      <th style={{ width: 28 }} />
                      <th>Description</th>
                      {!hideQ && <th className="r" style={{ width: 55 }}>Qty</th>}
                      {!hideQ && <th style={{ width: 55 }}>Unit</th>}
                      {!hideP && isCustomerDoc && <th className="r" style={{ width: 100 }}>Price</th>}
                      {!isCustomerDoc && <th className="r" style={{ width: 90 }}>Cost</th>}
                      {!isCustomerDoc && <th className="r" style={{ width: 90 }}>Price</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {flatItems.map((li) => {
                      const isGroup = li.type === 'group';
                      const isHidden = li.visible === false;
                      const vc = li.visible_cells || {};

                      return (
                        <tr key={li.id} className={`${isGroup ? 'group-row' : ''} ${isHidden ? 'hidden-row' : ''}`}>
                          <td style={{ textAlign: 'center', paddingLeft: 4, paddingRight: 4 }}>
                            <Tooltip title={isHidden ? 'Hidden from customer — click to show' : 'Visible to customer — click to hide'}>
                              <button
                                className={`dp-eye-btn${isHidden ? '' : ' visible'}`}
                                onClick={() => toggleMutation.mutate({ entryId: li.budget_entry_id, visible: !li.visible })}
                              >
                                {isHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                              </button>
                            </Tooltip>
                          </td>
                          <td className={li._depth > 0 ? 'indent-cell' : ''} style={{ paddingLeft: li._depth * 16 + 6 }}>
                            {isGroup ? (li.name || '—') : (
                              <>
                                <div>{li.name || <span style={{ color: '#4a5060' }}>—</span>}</div>
                                {li.description && <div style={{ color: '#6a7290', fontSize: 10, marginTop: 2 }}>{li.description}</div>}
                              </>
                            )}
                          </td>
                          {!hideQ && <td className="r">{isGroup ? '' : (li.quantity ?? '—')}</td>}
                          {!hideQ && <td>{isGroup ? '' : (li.unit || '—')}</td>}
                          {isCustomerDoc && !hideP && (
                            <td className="r">
                              {isGroup
                                ? <strong>{fmt$(sumGroupPrice(li))}</strong>
                                : (vc.ext_price === false ? <span style={{ color: '#4a5060' }}>—</span> : fmt$(li.ext_price))}
                            </td>
                          )}
                          {!isCustomerDoc && (
                            <>
                              <td className="r">{isGroup ? <strong>{fmt$(sumGroupCost(li))}</strong> : fmt$(li.ext_cost)}</td>
                              <td className="r">{isGroup ? <strong>{fmt$(sumGroupPrice(li))}</strong> : fmt$(li.ext_price)}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {/* Grand total / tax rows */}
                    {(() => {
                      const taxRate = Number(doc.tax_rate) || 0;
                      const taxAmt  = grandTotal * (taxRate / 100);
                      const gTotal  = grandTotal + taxAmt;
                      const extraCols = !hideQ ? 2 : 0;
                      const empties  = () => Array.from({ length: extraCols + 1 }, (_, i) => <td key={i} />);
                      const totalRow = (label, amount, amber, topBorder) => (
                        <tr style={topBorder ? { borderTop: '1px solid #2e3550' } : undefined}>
                          {empties()}
                          <td style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 11, color: amber ? '#d4870a' : '#9aa0b4', paddingTop: 8, textAlign: 'right' }}>{label}</td>
                          <td className="r" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: amber ? 700 : 600, fontSize: amber ? 13 : 11, color: amber ? '#d4870a' : '#9aa0b4', paddingTop: 8 }}>{fmt$(amount)}</td>
                        </tr>
                      );
                      if (taxRate > 0) return (<>
                        {totalRow('SUBTOTAL', grandTotal, false, true)}
                        {totalRow(`TAX (${taxRate.toFixed(2)}%)`, taxAmt, false, false)}
                        {totalRow('TOTAL', gTotal, true, true)}
                      </>);
                      return totalRow('TOTAL', grandTotal, true, true);
                    })()}
                  </tbody>
                </table>
              </div>
            )}

            {doc.notes && (
              <div className="dp-section">
                <div className="dp-section-title">Notes</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#9aa0b4', whiteSpace: 'pre-wrap' }}>{doc.notes}</div>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}

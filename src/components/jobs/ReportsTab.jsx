import React, { useMemo, useState } from 'react';
import { Spin, Button, Tooltip, message } from 'antd';
import { PrinterOutlined, InfoCircleOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client.js';

const rptStyles = `
  .rpt-page { padding: 0; }
  .rpt-section { background: #1e2436; border: 1px solid #2e3550; border-radius: 6px; padding: 20px 24px; margin-bottom: 16px; }
  .rpt-section-title { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #4a5060; border-bottom: 1px solid #252c42; padding-bottom: 6px; margin-bottom: 16px; }
  .rpt-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
  .rpt-table th { background: #0f1320; color: #9aa0b4; font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 7px 10px; text-align: left; border-bottom: 1px solid #2e3550; }
  .rpt-table th.r { text-align: right; }
  .rpt-table td { padding: 7px 10px; border-bottom: 1px solid #1a2236; color: #f0ede8; vertical-align: middle; }
  .rpt-table td.r { text-align: right; }
  .rpt-table tr.total-row td { background: #0d1122; font-weight: 700; font-family: 'Barlow Condensed', sans-serif; font-size: 13px; letter-spacing: 0.06em; border-top: 2px solid #2e3550; border-bottom: none; }
  .rpt-table tr.group-row td { background: #1a2035; color: #d4870a; font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; }
  .rpt-kpi { display: flex; gap: 16px; flex-wrap: wrap; }
  .rpt-kpi-card { flex: 1; min-width: 140px; background: #141826; border: 1px solid #2e3550; border-radius: 5px; padding: 14px 18px; }
  .rpt-kpi-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #4a5060; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; }
  .rpt-kpi-value { font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 700; color: #f0ede8; }
  .rpt-kpi-value.pos { color: #3db87a; }
  .rpt-kpi-value.neg { color: #e85555; }
  .rpt-over-budget { color: #e85555 !important; }
  .rpt-info-icon { font-size: 10px; color: #4a5060; cursor: help; }
`;

const fmt$ = (v) => (v == null ? '—' : `$${Number(v).toFixed(2)}`);
const fmtPct = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);
const r2 = (n) => Math.round(n * 100) / 100;

function buildTree(flat, parentId = null) {
  return flat
    .filter((e) => (e.parent_id ?? null) === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((e) => ({ ...e, children: buildTree(flat, e.id) }));
}

function flattenWithDepth(nodes, depth = 0) {
  const result = [];
  for (const node of nodes) {
    result.push({ ...node, _depth: depth });
    if (node.children?.length) result.push(...flattenWithDepth(node.children, depth + 1));
  }
  return result;
}

function InfoTip({ text }) {
  return (
    <Tooltip title={<span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>{text}</span>} mouseEnterDelay={0.3}>
      <InfoCircleOutlined className="rpt-info-icon" />
    </Tooltip>
  );
}

export default function ReportsTab({ jobId, job }) {
  const [downloading, setDownloading] = useState(false);
  const { data: budgetEntries = [], isLoading: budgetLoading } = useQuery({
    queryKey: ['budget', jobId],
    queryFn: async () => { const { data } = await client.get(`/jobs/${jobId}/budget`); return data; },
  });

  const { data: expenses = [], isLoading: expLoading } = useQuery({
    queryKey: ['expenses', jobId],
    queryFn: async () => { const { data } = await client.get(`/jobs/${jobId}/expenses`); return data; },
  });

  const isLoading = budgetLoading || expLoading;

  const { kpis, jobCostingRows, expenseRows, expTotals } = useMemo(() => {
    const items = budgetEntries.filter((e) => e.type === 'item');

    // unit_price = unit_cost × qty (total purchase cost per item)
    // ext_price  = ext_cost  × qty (total selling price per item)
    const calc = (e) => {
      const unitPrice = e.unit_price != null ? Number(e.unit_price)
        : (e.unit_cost != null && e.quantity != null ? Number(e.unit_cost) * Number(e.quantity) : 0);
      const extPrice  = e.ext_price  != null ? Number(e.ext_price)
        : (e.ext_cost  != null && e.quantity != null ? Number(e.ext_cost)  * Number(e.quantity) : 0);
      return { unitPrice, extPrice };
    };

    const budgetedCost  = items.reduce((s, e) => s + calc(e).unitPrice, 0);
    const budgetedPrice = items.reduce((s, e) => s + calc(e).extPrice,  0);
    const budgetedProfit = r2(budgetedPrice - budgetedCost);
    const budgetedMargin = budgetedPrice !== 0 ? r2((budgetedProfit / budgetedPrice) * 100) : null;

    const approvedExpenses = expenses.filter((e) => e.approved_for_payment);
    const actualCost = r2(expenses.reduce((s, e) => s + Number(e.amount), 0));
    const approvedCost = r2(approvedExpenses.reduce((s, e) => s + Number(e.amount), 0));

    // Actual profit = budgeted revenue - actual total costs
    const actualProfit = r2(budgetedPrice - actualCost);
    const actualMargin = budgetedPrice !== 0 ? r2((actualProfit / budgetedPrice) * 100) : null;

    // Job costing: budget entries with actual cost overlay
    const tree = buildTree(budgetEntries);
    const flat = flattenWithDepth(tree);

    const expByEntry = {};
    for (const exp of expenses) {
      if (exp.budget_entry_id) {
        expByEntry[exp.budget_entry_id] = (expByEntry[exp.budget_entry_id] || 0) + Number(exp.amount);
      }
    }

    const jobCostingRows = flat.map((e) => {
      const { unitPrice } = calc(e);
      const actual = expByEntry[e.id] || null;
      const variance = actual != null ? r2(unitPrice - actual) : null;
      return { ...e, budgeted: unitPrice, actual, variance };
    });

    const expenseRows = expenses.map((e) => ({ ...e, amount: Number(e.amount) }));

    const expTotals = {
      total:    r2(expenses.reduce((s, e) => s + Number(e.amount), 0)),
      approved: approvedCost,
    };

    return {
      kpis: { budgetedCost, budgetedPrice, budgetedProfit, budgetedMargin, actualCost, actualProfit, actualMargin },
      jobCostingRows,
      expenseRows,
      expTotals,
    };
  }, [budgetEntries, expenses]);

  const handlePrint = async () => {
    setDownloading(true);
    try {
      const res = await client.get(`/jobs/${jobId}/report/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] || `report_job${jobId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      message.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;

  return (
    <>
      <style>{rptStyles}</style>
      <div className="rpt-page">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Button
            icon={<PrinterOutlined />}
            loading={downloading}
            onClick={handlePrint}
            style={{ background: 'rgba(212,135,10,0.12)', border: '1px solid #d4870a', color: '#d4870a', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.08em' }}
          >
            Print Report
          </Button>
        </div>

        {/* KPI Summary */}
        <div className="rpt-section">
          <div className="rpt-section-title">Financial Summary</div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-label">
                Budgeted Cost
                <InfoTip text="Sum of (Unit Cost × Qty) for all budget items — total expected purchase cost" />
              </div>
              <div className="rpt-kpi-value">{fmt$(kpis.budgetedCost)}</div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-label">
                Budgeted Revenue
                <InfoTip text="Sum of (Ext Cost × Qty) for all budget items — total expected customer billing" />
              </div>
              <div className="rpt-kpi-value">{fmt$(kpis.budgetedPrice)}</div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-label">
                Actual Cost
                <InfoTip text="Sum of all recorded expenses (approved + pending)" />
              </div>
              <div className={`rpt-kpi-value ${kpis.actualCost > kpis.budgetedCost ? 'neg' : ''}`}>{fmt$(kpis.actualCost)}</div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-label">
                Budgeted Profit
                <InfoTip text="Budgeted Revenue − Budgeted Cost" />
              </div>
              <div className={`rpt-kpi-value ${kpis.budgetedProfit >= 0 ? 'pos' : 'neg'}`}>{fmt$(kpis.budgetedProfit)}</div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-label">
                Actual Profit
                <InfoTip text="Budgeted Revenue − Actual Cost" />
              </div>
              <div className={`rpt-kpi-value ${kpis.actualMargin == null ? '' : kpis.actualMargin >= 40 ? 'pos' : 'neg'}`}>{fmt$(kpis.actualProfit)}</div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-label">
                Budgeted Margin
                <InfoTip text="Budgeted Profit ÷ Budgeted Revenue × 100%" />
              </div>
              <div className={`rpt-kpi-value ${(kpis.budgetedMargin || 0) >= 0 ? 'pos' : 'neg'}`}>{fmtPct(kpis.budgetedMargin)}</div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-label">
                Actual Margin
                <InfoTip text="Actual Profit ÷ Budgeted Revenue × 100%" />
              </div>
              <div className={`rpt-kpi-value ${kpis.actualMargin == null ? '' : kpis.actualMargin >= 40 ? 'pos' : 'neg'}`}>{fmtPct(kpis.actualMargin)}</div>
            </div>
          </div>
        </div>

        {/* Job Costing */}
        <div className="rpt-section">
          <div className="rpt-section-title">Job Costing — Budget vs Actuals</div>
          <table className="rpt-table">
            <thead>
              <tr>
                <th>Line Item</th>
                <th className="r">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Budgeted Cost
                    <Tooltip title={<span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>Unit Cost × Qty for this item</span>} mouseEnterDelay={0.3}>
                      <InfoCircleOutlined style={{ fontSize: 9, color: '#4a5060', cursor: 'help' }} />
                    </Tooltip>
                  </span>
                </th>
                <th className="r">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Actual Cost
                    <Tooltip title={<span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>Expenses linked to this budget item</span>} mouseEnterDelay={0.3}>
                      <InfoCircleOutlined style={{ fontSize: 9, color: '#4a5060', cursor: 'help' }} />
                    </Tooltip>
                  </span>
                </th>
                <th className="r">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Variance
                    <Tooltip title={<span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>Budgeted − Actual. Negative = over budget</span>} mouseEnterDelay={0.3}>
                      <InfoCircleOutlined style={{ fontSize: 9, color: '#4a5060', cursor: 'help' }} />
                    </Tooltip>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {jobCostingRows.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#4a5060', padding: '24px 0' }}>No budget entries</td></tr>
              ) : (
                jobCostingRows.map((row) => (
                  <tr key={row.id} className={row.type === 'group' ? 'group-row' : ''}>
                    <td style={{ paddingLeft: 10 + row._depth * 16 }}>
                      {row.name || <span style={{ color: '#4a5060' }}>(unnamed)</span>}
                    </td>
                    <td className="r">{row.type === 'group' ? '' : (row.budgeted ? fmt$(row.budgeted) : <span style={{ color: '#4a5060' }}>—</span>)}</td>
                    <td className="r">{row.type === 'group' ? '' : (row.actual != null ? fmt$(row.actual) : <span style={{ color: '#4a5060' }}>—</span>)}</td>
                    <td className={`r ${row.type !== 'group' && row.variance != null && row.variance < 0 ? 'rpt-over-budget' : ''}`}>
                      {row.type === 'group' ? '' : (row.variance != null ? fmt$(row.variance) : <span style={{ color: '#4a5060' }}>—</span>)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Expenses Breakdown */}
        <div className="rpt-section">
          <div className="rpt-section-title">Expenses Breakdown</div>
          {expenseRows.length === 0 ? (
            <p style={{ color: '#4a5060', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}>No expenses recorded.</p>
          ) : (
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>PO #</th>
                  <th>Description</th>
                  <th>Budget Item</th>
                  <th className="r">Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {expenseRows.map((e) => (
                  <tr key={e.id}>
                    <td>{e.vendor || <span style={{ color: '#4a5060' }}>—</span>}</td>
                    <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>{e.po_number || <span style={{ color: '#4a5060' }}>—</span>}</td>
                    <td>{e.description || <span style={{ color: '#4a5060' }}>—</span>}</td>
                    <td style={{ color: '#9aa0b4', fontSize: 11 }}>{e.budget_entry_name || <span style={{ color: '#4a5060' }}>—</span>}</td>
                    <td className="r">{fmt$(e.amount)}</td>
                    <td>
                      <span style={{ color: e.approved_for_payment ? '#3db87a' : '#9aa0b4', fontSize: 11 }}>
                        {e.approved_for_payment ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {e.receipt_filename ? (
                        <Tooltip title={e.receipt_original_name || 'View receipt'} mouseEnterDelay={0.3}>
                          <a
                            href={`/api/jobs/${jobId}/expenses/${e.id}/receipt`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#3db87a', fontSize: 14 }}
                          >
                            <PaperClipOutlined />
                          </a>
                        </Tooltip>
                      ) : (
                        <span style={{ color: '#2e3550', fontSize: 14 }}><PaperClipOutlined /></span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={4}>TOTAL</td>
                  <td className="r">{fmt$(expTotals.total)}</td>
                  <td /><td />
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

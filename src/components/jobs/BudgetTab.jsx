import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Popconfirm, Select, Tabs, Tooltip, message } from 'antd';
import { DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import client from '../../api/client.js';

// ─── Math helpers ─────────────────────────────────────────────────────────────

const r2 = (n) => Math.round(n * 100) / 100;

function calcDerived(unitCost, qty, extCost) {
  const uc = unitCost != null ? Number(unitCost) : null;
  const q  = qty     != null ? Number(qty)      : null;
  const ec = extCost != null ? Number(extCost)  : null;
  const unit_price = uc != null && q != null ? r2(uc * q) : null;
  const ext_price  = ec != null && q != null ? r2(ec * q) : null;
  const profit = unit_price != null && ext_price != null ? r2(ext_price - unit_price) : null;
  const margin = profit != null && ext_price != null && ext_price !== 0
    ? r2((profit / ext_price) * 100) : null;
  return { unit_price, ext_price, profit, margin };
}

function calcFromMargin(marginPct, unitCost, qty) {
  const uc = unitCost != null ? Number(unitCost) : null;
  const q  = qty     != null ? Number(qty)      : null;
  const m  = marginPct != null ? Number(marginPct) : null;
  if (uc == null || q == null || m == null || q === 0 || m >= 100) return null;
  const unit_price = r2(uc * q);
  const ext_price  = r2(unit_price / (1 - m / 100));
  const ext_cost   = r2(ext_price / q);
  const profit     = r2(ext_price - unit_price);
  return { unit_price, ext_cost, ext_price, profit, margin: r2(m) };
}


function computeGroupTotals(node) {
  let unitCost = 0, unitPrice = 0, extCost = 0, extPrice = 0, profit = 0;
  for (const child of node.children || []) {
    if (child.type === 'group') {
      const sub = computeGroupTotals(child);
      unitCost  += sub.unitCost;  unitPrice += sub.unitPrice;
      extCost   += sub.extCost;   extPrice  += sub.extPrice;
      profit    += sub.profit;
    } else {
      const d = calcDerived(child.unit_cost, child.quantity, child.ext_cost);
      unitCost  += Number(child.unit_cost) || 0;
      unitPrice += d.unit_price ?? 0;
      extCost   += Number(child.ext_cost)  || 0;
      extPrice  += d.ext_price  ?? 0;
      profit    += d.profit     ?? 0;
    }
  }
  const margin = extPrice !== 0 ? r2((profit / extPrice) * 100) : 0;
  return { unitCost, unitPrice, extCost, extPrice, profit, margin };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const fmt$   = (n) => n == null ? '—' : `$${Number(n).toFixed(2)}`;
const fmtPct = (n) => n == null ? '—' : `${Number(n).toFixed(1)}%`;
const fmtNum = (n) => n == null ? '' : String(r2(Number(n)));

function buildTree(flat, parentId = null) {
  return flat
    .filter((e) => (e.parent_id ?? null) === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((e) => ({ ...e, children: buildTree(flat, e.id) }));
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = `
  .budget-wrap { padding: 16px 0; }
  .budget-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: #f0ede8;
  }
  .budget-table th {
    background: #0f1320;
    color: #9aa0b4;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 9px 8px;
    text-align: left;
    border-bottom: 2px solid #2e3550;
    border-right: 1px solid #2e3550;
    white-space: nowrap;
    overflow: hidden;
    position: relative;
    user-select: none;
  }
  .budget-table th:last-child { border-right: none; }
  .budget-table th.num { text-align: right; }
  .budget-table td {
    padding: 3px 6px;
    border-bottom: 1px solid #1e2436;
    border-right: 1px solid #1e2436;
    vertical-align: middle;
    overflow: hidden;
  }
  .budget-table td:last-child { border-right: none; }
  .budget-table td.num { text-align: right; }
  .budget-row-item { background: #141826; }
  .budget-row-item:hover { background: #182032; }
  .budget-row-group { background: #1a2035; }
  .budget-row-group:hover { background: #1f2840; }
  .budget-row-item.is-child > td:nth-child(2),
  .budget-row-group.is-child > td:nth-child(2) { border-left: 2px solid rgba(212,135,10,0.35); }
  .budget-row-item.dragging > td, .budget-row-group.dragging > td { opacity: 0.35; }
  tr.drop-before > td { border-top: 2px solid #d4870a !important; }
  tr.drop-after > td { border-bottom: 2px solid #d4870a !important; }
  tr.drop-into > td { background: rgba(212,135,10,0.12) !important; }
  tr.drop-into { outline: 1px solid #d4870a; }

  /* Column resize handle */
  .col-resize-handle {
    position: absolute;
    right: 0; top: 0; bottom: 0;
    width: 5px;
    cursor: col-resize;
    z-index: 1;
  }
  .col-resize-handle:hover { background: rgba(212,135,10,0.35); }

  /* Editable cell */
  .budget-cell-edit {
    cursor: text;
    min-height: 26px;
    display: inline-flex;
    align-items: center;
    width: 100%;
    padding: 2px 5px;
    border-radius: 3px;
    border: 1px solid transparent;
    transition: border-color 0.1s, background 0.1s;
    box-sizing: border-box;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .budget-cell-edit:hover {
    border-color: #3a4260;
    background: rgba(255,255,255,0.025);
  }
  .budget-cell-placeholder { color: #3a4060; font-size: 11px; }
  .budget-inline-input {
    background: #0d1122;
    border: 1px solid #d4870a;
    border-radius: 3px;
    color: #f0ede8;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    padding: 3px 6px;
    width: 100%;
    outline: none;
    box-sizing: border-box;
  }
  .budget-inline-input:focus { box-shadow: 0 0 0 2px rgba(212,135,10,0.2); }
  textarea.budget-inline-input { resize: vertical; min-height: 44px; }

  /* Read-only computed cell */
  .budget-cell-ro {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    width: 100%;
    padding: 2px 5px;
    cursor: default;
  }
  .budget-cell-ro .v { color: #7a8ba0; }
  .budget-cell-ro .i { font-size: 9px; color: #3a4260; cursor: help; }
  .budget-cell-ro.pos .v { color: #3db87a; }
  .budget-cell-ro.neg .v { color: #e85555; }

  /* Group row */
  .budget-chevron {
    cursor: pointer;
    display: inline-block;
    width: 16px;
    font-size: 10px;
    color: #9aa0b4;
    user-select: none;
    transition: transform 0.15s;
    flex-shrink: 0;
  }
  .budget-group-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.06em;
    color: #d4870a;
  }
  .grp-total { color: #606880; display: block; text-align: right; padding: 2px 5px; font-size: 12px; }

  /* Toolbar */
  .budget-add-btn {
    background: rgba(212,135,10,0.1);
    border: 1px solid rgba(212,135,10,0.3);
    border-radius: 3px;
    color: #d4870a;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 8px;
    cursor: pointer;
    margin-left: 4px;
    transition: background 0.1s;
  }
  .budget-add-btn:first-child { margin-left: 0; }
  .budget-add-btn:hover { background: rgba(212,135,10,0.22); }
  .budget-add-btn-root {
    background: rgba(212,135,10,0.12);
    border: 1px solid #d4870a;
    border-radius: 4px;
    color: #d4870a;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 7px 18px;
    cursor: pointer;
    margin-right: 10px;
    transition: background 0.1s;
  }
  .budget-add-btn-root:hover { background: rgba(212,135,10,0.26); }
  .budget-add-btn-root.sec {
    background: transparent;
    border-color: #3a4260;
    color: #9aa0b4;
  }
  .budget-add-btn-root.sec:hover { background: rgba(154,160,180,0.07); color: #d0cec8; }

  /* Row action icons */
  .bib { background: none; border: none; color: #3a4260; cursor: pointer; padding: 2px 4px; border-radius: 3px; font-size: 13px; transition: color 0.1s; line-height: 1; }
  .bib:hover { color: #d4870a; }
  .bib.del:hover { color: #e85555; }

  /* Summary footer */
  .budget-summary-row td {
    background: #0d1122;
    border-top: 2px solid #2e3550;
    border-bottom: none;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 8px 8px;
  }

  /* Name autocomplete dropdown — rendered via portal, position: fixed */
  .budget-name-drop {
    background: #0d1122;
    border: 1px solid #d4870a;
    border-radius: 4px;
    max-height: 220px;
    overflow-y: auto;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  }
  .budget-name-opt {
    padding: 7px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #1a2236;
    transition: background 0.07s;
  }
  .budget-name-opt:last-child { border-bottom: none; }
  .budget-name-opt:hover { background: #1a2236; }
  .budget-name-opt .on { color: #f0ede8; font-family: 'IBM Plex Mono',monospace; font-size: 12px; }
  .budget-name-opt .om { color: #6a7290; font-size: 11px; margin-left: auto; white-space: nowrap; padding-left: 12px; }
`;

// ─── ReadOnlyCell ─────────────────────────────────────────────────────────────

function ReadOnlyCell({ value, format, positive }) {
  const display = value != null ? (format ? format(value) : String(value)) : '—';
  let cls = 'budget-cell-ro';
  if (positive === true) cls += ' pos';
  else if (positive === false) cls += ' neg';
  return (
    <span className={cls}>
      <span className="v">{display}</span>
    </span>
  );
}

// ─── EditableCell ─────────────────────────────────────────────────────────────

function EditableCell({ value, onSave, isNumber, multiline, format, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    setDraft(value != null ? (isNumber ? fmtNum(value) : String(value)) : '');
    setEditing(true);
  };

  const commitEdit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    const finalVal = isNumber
      ? (trimmed === '' ? null : Number(trimmed))
      : (trimmed === '' ? null : trimmed);
    const prev = value != null ? (isNumber ? fmtNum(value) : String(value)) : '';
    if (trimmed !== prev) onSave(finalVal);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !multiline) commitEdit();
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    if (multiline) return <textarea autoFocus className="budget-inline-input" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commitEdit} onKeyDown={handleKey} rows={2} />;
    return <input autoFocus className="budget-inline-input" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commitEdit} onKeyDown={handleKey} type={isNumber ? 'number' : 'text'} step={isNumber ? 'any' : undefined} />;
  }

  const display = value != null ? (format ? format(value) : (isNumber ? fmtNum(value) : value)) : null;
  return (
    <span className="budget-cell-edit" onClick={startEdit}>
      {display != null && display !== ''
        ? display
        : <span className="budget-cell-placeholder">{placeholder || '—'}</span>}
    </span>
  );
}

// ─── NameCell — with catalog autocomplete via portal ─────────────────────────
// suggestions: array of {id, name, unit?, unit_cost?}
// onSelectSuggestion: called with the full suggestion object when user picks one
//   if omitted, just calls onSave(item.name)

function NameCell({ value, onSave, suggestions = [], onSelectSuggestion, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const [dropStyle, setDropStyle] = useState({});
  const inputRef = useRef(null);
  const dropRef  = useRef(null);
  const wrapRef  = useRef(null);

  const getSuggestions = (s) => {
    if (!suggestions.length || !s.trim()) return [];
    const lo = s.toLowerCase();
    return suggestions.filter((ci) => ci.name.toLowerCase().includes(lo)).slice(0, 10);
  };

  const commitEdit = useCallback(() => {
    setEditing(false);
    setShowDrop(false);
    const trimmed = draft.trim();
    const finalVal = trimmed === '' ? null : trimmed;
    if (String(value ?? '') !== String(finalVal ?? '')) onSave(finalVal);
  }, [draft, value, onSave]);

  const handleChange = (e) => {
    const v = e.target.value;
    setDraft(v);
    const matches = getSuggestions(v);
    if (matches.length > 0 && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropStyle({ position: 'fixed', top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 260), zIndex: 99999 });
      setShowDrop(true);
    } else {
      setShowDrop(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') { setEditing(false); setShowDrop(false); }
  };

  const handleSelect = (item) => {
    setEditing(false);
    setShowDrop(false);
    if (onSelectSuggestion) onSelectSuggestion(item);
    else onSave(item.name);
  };

  useEffect(() => {
    if (!showDrop) return;
    const handler = (e) => {
      if (!wrapRef.current?.contains(e.target) && !dropRef.current?.contains(e.target)) {
        setShowDrop(false);
        commitEdit();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDrop, commitEdit]);

  if (editing) {
    const suggestions_ = getSuggestions(draft);
    return (
      <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
        <input
          ref={inputRef}
          autoFocus
          className="budget-inline-input"
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKey}
          onBlur={() => setTimeout(() => { if (!dropRef.current?.contains(document.activeElement)) commitEdit(); }, 150)}
          placeholder="Type to search catalog..."
        />
        {showDrop && suggestions_.length > 0 && createPortal(
          <div ref={dropRef} className="budget-name-drop" style={dropStyle}>
            {suggestions_.map((ci) => (
              <div key={ci.id} className="budget-name-opt" onMouseDown={(e) => { e.preventDefault(); handleSelect(ci); }}>
                <span className="on">{ci.name}</span>
                {(ci.unit || ci.unit_cost != null) && (
                  <span className="om">
                    {ci.unit && <span>{ci.unit}</span>}
                    {ci.unit_cost != null && <span style={{ marginLeft: 6 }}>${Number(ci.unit_cost).toFixed(2)}</span>}
                  </span>
                )}
              </div>
            ))}
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <span className="budget-cell-edit" onClick={() => { setDraft(value ?? ''); setEditing(true); }}>
      {value ? value : <span className="budget-cell-placeholder">{placeholder || 'Enter name...'}</span>}
    </span>
  );
}

// ─── CatalogPicker — tabbed modal (Individual Items first, then Groups) ───────

function CatalogPicker({ visible, onCancel, onPickGroup, onPickItems }) {
  const [tab, setTab] = useState('items');
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  const { data: groups = [], isLoading: gLoad } = useQuery({
    queryKey: ['catalog-groups'],
    queryFn: async () => { const { data } = await client.get('/catalog/groups'); return data; },
    enabled: visible,
  });
  const { data: items = [], isLoading: iLoad } = useQuery({
    queryKey: ['catalog-items'],
    queryFn: async () => { const { data } = await client.get('/catalog/items'); return data; },
    enabled: visible,
  });

  useEffect(() => {
    if (visible) { setTab('items'); setSelectedGroupId(null); setSelectedItemIds([]); }
  }, [visible]);

  const handleOk = () => {
    if (tab === 'groups') {
      const grp = groups.find((g) => g.id === selectedGroupId);
      if (grp) onPickGroup(grp);
    } else {
      const sel = items.filter((ci) => selectedItemIds.includes(ci.id));
      if (sel.length > 0) onPickItems(sel);
    }
  };

  const okDisabled = tab === 'groups' ? !selectedGroupId : selectedItemIds.length === 0;
  const okText = tab === 'groups'
    ? 'Add as Group'
    : selectedItemIds.length > 0 ? `Add ${selectedItemIds.length} Item${selectedItemIds.length > 1 ? 's' : ''}` : 'Add Items';

  // Build group options — only show root groups (not sub-groups) to avoid confusion
  const rootGroups = groups.filter(g => !g.parent_id);
  const groupOptions = rootGroups.map((g) => ({ value: g.id, label: g.name }));

  return (
    <Modal
      open={visible}
      title={<span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, letterSpacing: '0.1em', color: '#f0ede8' }}>ADD FROM CATALOG</span>}
      onCancel={onCancel}
      onOk={handleOk}
      okText={okText}
      okButtonProps={{ disabled: okDisabled }}
      styles={{ body: { background: '#141826', paddingTop: 8 } }}
      width={480}
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        size="small"
        items={[
          {
            key: 'items',
            label: 'Individual Items',
            children: (
              <div style={{ paddingTop: 12 }}>
                <Select
                  mode="multiple"
                  showSearch
                  placeholder="Search and select items..."
                  loading={iLoad}
                  style={{ width: '100%' }}
                  value={selectedItemIds}
                  onChange={setSelectedItemIds}
                  filterOption={(input, option) => option?.label?.toLowerCase().includes(input.toLowerCase())}
                  options={items.map((ci) => ({ value: ci.id, label: ci.name }))}
                  styles={{ popup: { root: { background: '#0f1320' } } }}
                  maxTagCount="responsive"
                />
                {selectedItemIds.length > 0 && (
                  <p style={{ color: '#9aa0b4', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, marginTop: 10 }}>
                    {selectedItemIds.length} item{selectedItemIds.length > 1 ? 's' : ''} will be added as individual rows.
                  </p>
                )}
              </div>
            ),
          },
          {
            key: 'groups',
            label: 'Group',
            children: (
              <div style={{ paddingTop: 12 }}>
                <Select
                  showSearch
                  placeholder="Search catalog groups..."
                  loading={gLoad}
                  style={{ width: '100%' }}
                  value={selectedGroupId}
                  onChange={setSelectedGroupId}
                  filterOption={(input, option) => option?.label?.toLowerCase().includes(input.toLowerCase())}
                  options={groupOptions}
                  styles={{ popup: { root: { background: '#0f1320' } } }}
                />
                {selectedGroupId && (
                  <p style={{ color: '#9aa0b4', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, marginTop: 10 }}>
                    A collapsible budget group will be created with all items and sub-groups inside it.
                  </p>
                )}
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}

// ─── BudgetRow ────────────────────────────────────────────────────────────────

function BudgetRow({ entry, depth, collapsed, onToggle, onAddChild, mutations, catalogItems, catalogGroups, onImportCatalogGroup }) {
  const isGroup = entry.type === 'group';
  const indent  = depth * 22;
  const { updateMutation, removeMutation } = mutations;
  const dragFromHandle = useRef(false);

  const saveField = useCallback((field) => (val) => {
    updateMutation.mutate({ entryId: entry.id, data: { [field]: val } });
  }, [entry.id, updateMutation]);

  const saveInput = useCallback((field) => (val) => {
    const uc = field === 'unit_cost' ? val : entry.unit_cost;
    const q  = field === 'quantity'  ? val : entry.quantity;
    const ec = field === 'ext_cost'  ? val : entry.ext_cost;
    // Bidirectional: editing unit_price back-calculates unit_cost
    if (field === 'unit_price') {
      const newUc = (val != null && q != null && Number(q) !== 0) ? r2(Number(val) / Number(q)) : null;
      const d = calcDerived(newUc, q, ec);
      updateMutation.mutate({ entryId: entry.id, data: { unit_cost: newUc, ...d } });
      return;
    }
    if (field !== 'ext_cost' && entry.margin != null) {
      const result = calcFromMargin(entry.margin, uc, q);
      if (result) { updateMutation.mutate({ entryId: entry.id, data: { [field]: val, ...result } }); return; }
    }
    const d = calcDerived(uc, q, ec);
    updateMutation.mutate({ entryId: entry.id, data: { [field]: val, ...d } });
  }, [entry.id, entry.unit_cost, entry.quantity, entry.ext_cost, entry.margin, updateMutation]);

  const saveMargin = useCallback((val) => {
    const result = calcFromMargin(val, entry.unit_cost, entry.quantity);
    if (!result) {
      message.warning(Number(val) >= 100 ? 'Margin cannot be 100% or more' : 'Set Unit Cost and Quantity before editing Margin');
      return;
    }
    updateMutation.mutate({ entryId: entry.id, data: result });
  }, [entry.id, entry.unit_cost, entry.quantity, updateMutation]);

  // Catalog item selected from autocomplete — fills all fields
  const handleCatalogSelect = useCallback((ci) => {
    const unit_cost = ci.unit_cost  != null ? ci.unit_cost  : null;
    const ext_cost  = ci.unit_price != null ? ci.unit_price : null;
    const d = calcDerived(unit_cost, entry.quantity, ext_cost);
    updateMutation.mutate({ entryId: entry.id, data: { name: ci.name, description: ci.description || null, unit: ci.unit || null, unit_cost, ext_cost, ...d } });
  }, [entry.id, entry.quantity, updateMutation]);

  if (isGroup) {
    const t = computeGroupTotals(entry);
    const pos = t.profit >= 0;
    const rootGroups = (catalogGroups || []).filter(g => !g.parent_id);
    return (
      <tr
        className={`budget-row-group${depth > 0 ? ' is-child' : ''}${mutations.draggingId === entry.id ? ' dragging' : ''}${mutations.dropState?.targetId === entry.id ? ' drop-' + mutations.dropState.position : ''}`}
        draggable
        onDragStart={(e) => { if (!dragFromHandle.current) { e.preventDefault(); return; } dragFromHandle.current = false; e.dataTransfer.setData('text/plain', entry.id); e.dataTransfer.effectAllowed = 'move'; mutations.setDraggingId(entry.id); }}
        onDragOver={(e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); const pct = (e.clientY - r.top) / r.height; const pos = pct < 0.3 ? 'before' : pct > 0.7 ? 'after' : 'into'; mutations.setDropState(prev => prev?.targetId === entry.id && prev?.position === pos ? prev : { targetId: entry.id, position: pos }); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) mutations.setDropState(null); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const id = e.dataTransfer.getData('text/plain'); const pos = mutations.dropState?.targetId === entry.id ? mutations.dropState.position : 'into'; mutations.onDrop(id, entry, pos); }}
        onDragEnd={() => { dragFromHandle.current = false; mutations.setDraggingId(null); mutations.setDropState(null); }}
      >
        <Tooltip title="Drag to reorder" mouseEnterDelay={1} placement="right">
          <td style={{ textAlign: 'center', paddingLeft: 0, paddingRight: 0, cursor: 'grab', color: '#3a4260', width: 28 }} onMouseDown={() => { dragFromHandle.current = true; }}>
            <HolderOutlined style={{ fontSize: 12, pointerEvents: 'none' }} />
          </td>
        </Tooltip>
        <td style={{ paddingLeft: indent + 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {entry.children?.length > 0 ? (
              <span className="budget-chevron" onClick={() => onToggle(entry.id)} style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▼</span>
            ) : (
              <span style={{ display: 'inline-block', width: 16, flexShrink: 0 }} />
            )}
            <span className="budget-group-name" style={{ flex: 1, minWidth: 0 }}>
              <NameCell value={entry.name} onSave={saveField('name')} suggestions={rootGroups} onSelectSuggestion={onImportCatalogGroup ? (g) => onImportCatalogGroup(entry, g) : undefined} placeholder="Group name..." />
            </span>
          </div>
        </td>
        <td><EditableCell value={entry.description} onSave={saveField('description')} multiline placeholder="Description..." /></td>
        <td className="num" /><td className="num" />
        <td className="num"><span className="grp-total">{fmt$(t.unitCost)}</span></td>
        <td className="num"><span className="grp-total">{fmt$(t.extCost)}</span></td>
        <td className="num"><span className="grp-total">{fmt$(t.unitPrice)}</span></td>
        <td className="num"><span className="grp-total">{fmt$(t.extPrice)}</span></td>
        <td className="num"><span className="grp-total" style={{ color: pos ? '#3db87a' : '#e85555' }}>{fmt$(t.profit)}</span></td>
        <td className="num"><span className="grp-total" style={{ color: pos ? '#3db87a' : '#e85555' }}>{fmtPct(t.margin)}</span></td>
        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          <button className="budget-add-btn" onClick={() => onAddChild(entry.id, 'item')}>+ Item</button>
          <button className="budget-add-btn" onClick={() => onAddChild(entry.id, 'group')}>+ Group</button>
          {entry.children?.length > 0 ? (
            <Popconfirm
              title="Delete group?"
              description="This will also delete all items inside."
              okText="Delete" cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={() => removeMutation.mutate(entry.id)}
            >
              <Tooltip title="Delete group" mouseEnterDelay={1}><button className="bib del" style={{ marginLeft: 4 }}><DeleteOutlined /></button></Tooltip>
            </Popconfirm>
          ) : (
            <Tooltip title="Delete group" mouseEnterDelay={1}><button className="bib del" style={{ marginLeft: 4 }} onClick={() => removeMutation.mutate(entry.id)}><DeleteOutlined /></button></Tooltip>
          )}
        </td>
      </tr>
    );
  }

  const derived = calcDerived(entry.unit_cost, entry.quantity, entry.ext_cost);
  const pos = derived.profit != null ? derived.profit >= 0 : null;

  return (
    <tr
      className={`budget-row-item${depth > 0 ? ' is-child' : ''}${mutations.draggingId === entry.id ? ' dragging' : ''}${mutations.dropState?.targetId === entry.id ? ' drop-' + mutations.dropState.position : ''}`}
      draggable
      onDragStart={(e) => { if (!dragFromHandle.current) { e.preventDefault(); return; } dragFromHandle.current = false; e.dataTransfer.setData('text/plain', entry.id); e.dataTransfer.effectAllowed = 'move'; mutations.setDraggingId(entry.id); }}
      onDragOver={(e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); const pos = (e.clientY - r.top) / r.height < 0.5 ? 'before' : 'after'; mutations.setDropState(prev => prev?.targetId === entry.id && prev?.position === pos ? prev : { targetId: entry.id, position: pos }); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) mutations.setDropState(null); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const id = e.dataTransfer.getData('text/plain'); const pos = mutations.dropState?.targetId === entry.id ? mutations.dropState.position : 'after'; mutations.onDrop(id, entry, pos); }}
      onDragEnd={() => { dragFromHandle.current = false; mutations.setDraggingId(null); mutations.setDropState(null); }}
    >
      <Tooltip title="Drag to reorder" mouseEnterDelay={1} placement="right">
        <td style={{ textAlign: 'center', paddingLeft: 0, paddingRight: 0, cursor: 'grab', color: '#3a4260', width: 28 }} onMouseDown={() => { dragFromHandle.current = true; }}>
          <HolderOutlined style={{ fontSize: 12, pointerEvents: 'none' }} />
        </td>
      </Tooltip>
      <td style={{ paddingLeft: indent + 26 }}>
        <NameCell value={entry.name} onSave={saveField('name')} suggestions={catalogItems || []} onSelectSuggestion={handleCatalogSelect} />
      </td>
      <td><EditableCell value={entry.description} onSave={saveField('description')} multiline placeholder="Add description..." /></td>
      <td className="num"><EditableCell value={entry.quantity} onSave={saveInput('quantity')} isNumber placeholder="1" /></td>
      <td className="num"><EditableCell value={entry.unit} onSave={saveField('unit')} placeholder="unit" /></td>
      <td className="num"><EditableCell value={entry.unit_cost} onSave={saveInput('unit_cost')} isNumber format={fmt$} placeholder="$0.00" /></td>
      <td className="num"><EditableCell value={entry.ext_cost} onSave={saveInput('ext_cost')} isNumber format={fmt$} placeholder="$0.00" /></td>
      <td className="num"><EditableCell value={derived.unit_price} onSave={saveInput('unit_price')} isNumber format={fmt$} placeholder="$0.00" /></td>
      <td className="num"><ReadOnlyCell value={derived.ext_price} format={fmt$} /></td>
      <td className="num"><ReadOnlyCell value={derived.profit} format={fmt$} positive={pos} /></td>
      <td className="num"><EditableCell value={entry.margin ?? derived.margin} onSave={saveMargin} isNumber format={fmtPct} placeholder="0%" /></td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        <Tooltip title="Delete item" mouseEnterDelay={1}><button className="bib del" onClick={() => removeMutation.mutate(entry.id)}><DeleteOutlined /></button></Tooltip>
      </td>
    </tr>
  );
}

function renderTree(nodes, depth, collapsed, onToggle, onAddChild, mutations, catalogItems, catalogGroups, onImportCatalogGroup) {
  const rows = [];
  for (const node of nodes) {
    const isCollapsed = collapsed.has(node.id);
    rows.push(
      <BudgetRow key={node.id} entry={node} depth={depth} collapsed={isCollapsed} onToggle={onToggle} onAddChild={onAddChild} mutations={mutations} catalogItems={catalogItems} catalogGroups={catalogGroups} onImportCatalogGroup={onImportCatalogGroup} />
    );
    if (node.type === 'group' && !isCollapsed && node.children?.length > 0) {
      rows.push(...renderTree(node.children, depth + 1, collapsed, onToggle, onAddChild, mutations, catalogItems, catalogGroups, onImportCatalogGroup));
    }
  }
  return rows;
}

// ─── BudgetTab ────────────────────────────────────────────────────────────────

const DEFAULT_WIDTHS = { drag: 28, name: 200, desc: 170, qty: 68, unit: 68, unitCost: 100, extCost: 100, unitPrice: 100, extPrice: 100, profit: 100, margin: 82, actions: 104 };

export default function BudgetTab({ jobId }) {
  const queryClient = useQueryClient();
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [colWidths, setColWidths] = useState(DEFAULT_WIDTHS);
  const [draggingId, setDraggingId] = useState(null);
  const [dropState, setDropState] = useState(null); // { targetId, position: 'before'|'after'|'into' }

  const startResize = useCallback((col) => (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[col];
    const onMove = (me) => setColWidths((prev) => ({ ...prev, [col]: Math.max(50, startW + (me.clientX - startX)) }));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [colWidths]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['budget', jobId],
    queryFn: async () => { const { data } = await client.get(`/jobs/${jobId}/budget`); return data; },
  });

  const { data: catalogItems = [] } = useQuery({
    queryKey: ['catalog-items'],
    queryFn: async () => { const { data } = await client.get('/catalog/items'); return data; },
  });

  const { data: catalogGroups = [] } = useQuery({
    queryKey: ['catalog-groups'],
    queryFn: async () => { const { data } = await client.get('/catalog/groups'); return data; },
  });

  const invalidate = useCallback(() => queryClient.invalidateQueries({ queryKey: ['budget', jobId] }), [queryClient, jobId]);

  const createMutation = useMutation({
    mutationFn: async ({ type, parent_id }) => {
      const body = { type, name: '', parent_id: parent_id || null };
      if (type === 'item') { body.quantity = 1; body.margin = 40; }
      const { data } = await client.post(`/jobs/${jobId}/budget`, body);
      return data;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ entryId, data }) => { const { data: res } = await client.put(`/jobs/${jobId}/budget/${entryId}`, data); return res; },
    onMutate: async ({ entryId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['budget', jobId] });
      const prev = queryClient.getQueryData(['budget', jobId]);
      queryClient.setQueryData(['budget', jobId], (old) => (old || []).map((e) => e.id === entryId ? { ...e, ...data } : e));
      return { prev };
    },
    onError: (_e, _v, ctx) => { queryClient.setQueryData(['budget', jobId], ctx?.prev); message.error('Failed to save'); },
    onSettled: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: async (entryId) => { await client.delete(`/jobs/${jobId}/budget/${entryId}`); },
    onSuccess: invalidate,
  });

  const handleToggle = useCallback((id) => {
    setCollapsedGroups((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const handleAddChild = useCallback((parentId, type) => {
    createMutation.mutate({ type, parent_id: parentId });
  }, [createMutation]);

  // Import catalog group items into an EXISTING budget group (triggered from NameCell selection)
  const handleImportCatalogGroup = useCallback(async (budgetEntry, catalogGroup) => {
    try {
      // Update the group's name/description to match catalog
      await client.put(`/jobs/${jobId}/budget/${budgetEntry.id}`, { name: catalogGroup.name, description: catalogGroup.description || null });

      // Add items from the top-level catalog group
      const { data: groupItems } = await client.get(`/catalog/groups/${catalogGroup.id}/items`);
      for (const gi of groupItems) {
        const ext_cost = gi.unit_price != null ? gi.unit_price : null;
        const qty = gi.quantity != null ? Number(gi.quantity) : 1;
        const d = calcDerived(gi.unit_cost, qty, ext_cost);
        await client.post(`/jobs/${jobId}/budget`, {
          type: 'item', name: gi.name, description: gi.description || null,
          unit: gi.unit || null, unit_cost: gi.unit_cost != null ? gi.unit_cost : null,
          quantity: qty, ext_cost, ...d, parent_id: budgetEntry.id,
        });
      }

      // Add sub-groups
      const subGroups = catalogGroups.filter((g) => g.parent_id === catalogGroup.id);
      for (const sg of subGroups) {
        const { data: budgetSubGroup } = await client.post(`/jobs/${jobId}/budget`, {
          type: 'group', name: sg.name, description: sg.description || null, parent_id: budgetEntry.id,
        });
        const { data: sgItems } = await client.get(`/catalog/groups/${sg.id}/items`);
        for (const si of sgItems) {
          const ext_cost = si.unit_price != null ? si.unit_price : null;
          const qty = si.quantity != null ? Number(si.quantity) : 1;
          const d = calcDerived(si.unit_cost, qty, ext_cost);
          await client.post(`/jobs/${jobId}/budget`, {
            type: 'item', name: si.name, unit: si.unit || null,
            unit_cost: si.unit_cost != null ? si.unit_cost : null,
            quantity: qty, ext_cost, ...d, parent_id: budgetSubGroup.id,
          });
        }
      }

      invalidate();
      message.success(`Imported "${catalogGroup.name}"`);
    } catch { message.error('Failed to import catalog group'); }
  }, [jobId, invalidate, catalogGroups]);

  // Add a catalog group as a NEW budget group (from picker modal)
  const handlePickGroup = useCallback(async (catalogGroup) => {
    setPickerVisible(false);
    try {
      const { data: budgetGroup } = await client.post(`/jobs/${jobId}/budget`, { type: 'group', name: catalogGroup.name, description: catalogGroup.description || null, parent_id: null });

      // Add items from the top-level catalog group
      const { data: groupItems } = await client.get(`/catalog/groups/${catalogGroup.id}/items`);
      for (const gi of groupItems) {
        const ext_cost = gi.unit_price != null ? gi.unit_price : null;
        const qty = gi.quantity != null ? Number(gi.quantity) : 1;
        const d = calcDerived(gi.unit_cost, qty, ext_cost);
        await client.post(`/jobs/${jobId}/budget`, {
          type: 'item', name: gi.name, description: gi.description || null,
          unit: gi.unit || null, unit_cost: gi.unit_cost != null ? gi.unit_cost : null,
          quantity: qty, ext_cost, ...d, parent_id: budgetGroup.id,
        });
      }

      // Add sub-groups of the catalog group (one level deep)
      const subGroups = catalogGroups.filter((g) => g.parent_id === catalogGroup.id);
      for (const sg of subGroups) {
        const { data: budgetSubGroup } = await client.post(`/jobs/${jobId}/budget`, {
          type: 'group', name: sg.name, description: sg.description || null, parent_id: budgetGroup.id,
        });
        const { data: sgItems } = await client.get(`/catalog/groups/${sg.id}/items`);
        for (const si of sgItems) {
          const ext_cost = si.unit_price != null ? si.unit_price : null;
          const qty = si.quantity != null ? Number(si.quantity) : 1;
          const d = calcDerived(si.unit_cost, qty, ext_cost);
          await client.post(`/jobs/${jobId}/budget`, {
            type: 'item', name: si.name, description: si.description || null,
            unit: si.unit || null, unit_cost: si.unit_cost != null ? si.unit_cost : null,
            quantity: qty, ext_cost, ...d, parent_id: budgetSubGroup.id,
          });
        }
      }

      invalidate();
      message.success(`"${catalogGroup.name}" added${subGroups.length > 0 ? ` with ${subGroups.length} sub-group${subGroups.length > 1 ? 's' : ''}` : ''}`);
    } catch { message.error('Failed to import group'); }
  }, [jobId, invalidate, catalogGroups]);

  const handlePickItems = useCallback(async (selectedItems) => {
    setPickerVisible(false);
    try {
      for (const ci of selectedItems) {
        const ext_cost = ci.unit_price != null ? ci.unit_price : null;
        const d = calcDerived(ci.unit_cost, 1, ext_cost);
        await client.post(`/jobs/${jobId}/budget`, { type: 'item', name: ci.name, description: ci.description || null, unit: ci.unit || null, unit_cost: ci.unit_cost != null ? ci.unit_cost : null, quantity: 1, ext_cost, ...d, parent_id: null });
      }
      invalidate();
      message.success(`Added ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}`);
    } catch { message.error('Failed to add items'); }
  }, [jobId, invalidate]);

  const handleDrop = useCallback(async (draggedId, targetEntry, position) => {
    setDraggingId(null);
    setDropState(null);
    if (draggedId === targetEntry.id) return;
    const dragged = entries.find(e => e.id === draggedId);
    if (!dragged) return;

    // Prevent dropping a group into its own descendant
    if (position === 'into') {
      const isDescendant = (parentId, checkId) =>
        entries.filter(e => e.parent_id === parentId).some(c => c.id === checkId || isDescendant(c.id, checkId));
      if (isDescendant(draggedId, targetEntry.id)) return;
    }

    try {
      const newParentId = position === 'into' ? targetEntry.id : (targetEntry.parent_id ?? null);
      const oldParentId = dragged.parent_id ?? null;

      // Siblings at the target level (excluding dragged item)
      const targetSiblings = entries
        .filter(e => (e.parent_id ?? null) === newParentId && e.id !== draggedId)
        .sort((a, b) => a.sort_order - b.sort_order);

      let insertIdx;
      if (position === 'into') {
        insertIdx = targetSiblings.length; // place at end of group
      } else {
        const targetIdx = targetSiblings.findIndex(e => e.id === targetEntry.id);
        insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
      }

      // Build new ordered list at target level
      const newList = [
        ...targetSiblings.slice(0, insertIdx),
        dragged,
        ...targetSiblings.slice(insertIdx),
      ];

      // Build all updates needed
      const updates = [];

      // Dragged item: new parent + new sort_order
      updates.push(client.put(`/jobs/${jobId}/budget/${draggedId}`, {
        parent_id: newParentId,
        sort_order: insertIdx,
      }));

      // Re-index other entries in target level
      newList.forEach((e, i) => {
        if (e.id !== draggedId && e.sort_order !== i) {
          updates.push(client.put(`/jobs/${jobId}/budget/${e.id}`, { sort_order: i }));
        }
      });

      // Normalize source level if parent changed
      if (oldParentId !== newParentId) {
        entries
          .filter(e => (e.parent_id ?? null) === oldParentId && e.id !== draggedId)
          .sort((a, b) => a.sort_order - b.sort_order)
          .forEach((e, i) => {
            if (e.sort_order !== i) updates.push(client.put(`/jobs/${jobId}/budget/${e.id}`, { sort_order: i }));
          });
      }

      await Promise.all(updates);
      invalidate();
    } catch { message.error('Failed to move item'); }
  }, [entries, jobId, invalidate]);

  const tree = buildTree(entries);
  const mutations = { updateMutation, removeMutation, draggingId, setDraggingId, dropState, setDropState, onDrop: handleDrop };

  let totUC = 0, totUP = 0, totEC = 0, totEP = 0, totP = 0;
  for (const e of entries) {
    if (e.type === 'item') {
      const d = calcDerived(e.unit_cost, e.quantity, e.ext_cost);
      totUC += Number(e.unit_cost) || 0;
      totUP += d.unit_price ?? 0;
      totEC += Number(e.ext_cost) || 0;
      totEP += d.ext_price ?? 0;
      totP  += d.profit ?? 0;
    }
  }
  const totM = totEP !== 0 ? r2((totP / totEP) * 100) : null;

  const W = colWidths;

  return (
    <>
      <style>{styles}</style>
      <div className="budget-wrap">
        {isLoading ? (
          <div style={{ color: '#6a7290', fontFamily: "'IBM Plex Mono',monospace", padding: 24 }}>Loading budget...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="budget-table">
                <colgroup>
                  <col style={{ width: W.drag }} /><col style={{ width: W.name }} />
                  <col style={{ width: W.desc }} /><col style={{ width: W.qty }} />
                  <col style={{ width: W.unit }} /><col style={{ width: W.unitCost }} />
                  <col style={{ width: W.extCost }} /><col style={{ width: W.unitPrice }} />
                  <col style={{ width: W.extPrice }} /><col style={{ width: W.profit }} />
                  <col style={{ width: W.margin }} /><col style={{ width: W.actions }} />
                </colgroup>
                <thead>
                  <tr>
                    <th />
                    {[
                      ['name', 'Name', false],
                      ['desc', 'Description', false],
                      ['qty', 'Qty', true],
                      ['unit', 'Unit', true],
                      ['unitCost', 'Unit Cost', true],
                      ['extCost', 'Ext Cost', true],
                      ['unitPrice', null, true],
                      ['extPrice', 'Ext Price', true],
                      ['profit', 'Profit', true],
                      ['margin', null, true],
                      [null, '', false],
                    ].map(([col, label, isNum], i) => (
                      <th key={i} className={isNum ? 'num' : ''}>
                        {col === 'margin' ? (
                          <Tooltip title="Editing margin adjusts Ext Cost" mouseEnterDelay={0.3}>
                            <span style={{ cursor: 'help', borderBottom: '1px dashed #4a5060' }}>Margin</span>
                          </Tooltip>
                        ) : col === 'unitPrice' ? (
                          <Tooltip title="Unit Cost × Qty — edit to back-calculate Unit Cost" mouseEnterDelay={0.3}>
                            <span style={{ cursor: 'help', borderBottom: '1px dashed #4a5060' }}>Unit Price</span>
                          </Tooltip>
                        ) : label}
                        {col && <span className="col-resize-handle" onMouseDown={startResize(col)} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tree.length === 0 ? (
                    <tr><td colSpan={12} style={{ textAlign: 'center', color: '#4a5060', padding: '40px 0', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, letterSpacing: '0.06em' }}>
                      No budget entries yet — use the buttons below to get started.
                    </td></tr>
                  ) : renderTree(tree, 0, collapsedGroups, handleToggle, handleAddChild, mutations, catalogItems, catalogGroups, handleImportCatalogGroup)}
                </tbody>
                {entries.length > 0 && (
                  <tfoot>
                    <tr className="budget-summary-row">
                      <td />
                      <td colSpan={4} style={{ color: '#9aa0b4' }}>TOTALS</td>
                      <td className="num">{fmt$(totUC)}</td>
                      <td className="num">{fmt$(totEC)}</td>
                      <td className="num">{fmt$(totUP)}</td>
                      <td className="num">{fmt$(totEP)}</td>
                      <td className="num" style={{ color: totP >= 0 ? '#3db87a' : '#e85555' }}>{fmt$(totP)}</td>
                      <td className="num" style={{ color: totM != null && totM >= 0 ? '#3db87a' : '#e85555' }}>{fmtPct(totM)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center' }}>
              <button className="budget-add-btn-root" onClick={() => setPickerVisible(true)} disabled={createMutation.isPending}>From Catalog</button>
              <button className="budget-add-btn-root sec" onClick={() => createMutation.mutate({ type: 'item', parent_id: null })} disabled={createMutation.isPending}>New Item</button>
              <button className="budget-add-btn-root sec" onClick={() => createMutation.mutate({ type: 'group', parent_id: null })} disabled={createMutation.isPending}>New Group</button>
            </div>

            <CatalogPicker visible={pickerVisible} onCancel={() => setPickerVisible(false)} onPickGroup={handlePickGroup} onPickItems={handlePickItems} />
          </>
        )}
      </div>
    </>
  );
}

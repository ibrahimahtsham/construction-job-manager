import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Tabs, Spin, Button, Select, Input, Switch, DatePicker, message } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import dayjs from 'dayjs';
import client from '../api/client.js';
import JobFormModal from '../components/jobs/JobFormModal.jsx';
import BudgetTab from '../components/jobs/BudgetTab.jsx';
import DocumentsTab from '../components/jobs/DocumentsTab.jsx';
import ExpensesTab from '../components/jobs/ExpensesTab.jsx';
import ReportsTab from '../components/jobs/ReportsTab.jsx';
import FilesTab from '../components/jobs/FilesTab.jsx';
import ContactsTab from '../components/jobs/ContactsTab.jsx';
import EditableField, { efStyles } from '../components/jobs/EditableField.jsx';
import CategorySelect from '../components/common/CategorySelect.jsx';

const pageStyles = `
  .job-detail-page {
    min-height: 100%;
    background: #141826;
  }

  .job-detail-header {
    background: #0f1320;
    border-bottom: 1px solid #2e3550;
    padding: 16px 28px;
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .job-detail-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: 1px solid #2e3550;
    border-radius: 4px;
    color: #9aa0b4;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 5px 12px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .job-detail-back-btn:hover {
    color: #f0ede8;
    border-color: #9aa0b4;
  }

  .job-detail-job-number {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #d4870a;
  }

  .job-detail-job-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #f0ede8;
    flex: 1;
  }

  .job-detail-body {
    padding: 24px 28px;
  }

  .job-detail-page .ant-tabs-nav {
    margin-bottom: 0 !important;
  }

  .job-detail-page .ant-tabs-tab {
    font-family: 'Barlow Condensed', sans-serif !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    letter-spacing: 0.08em !important;
    text-transform: uppercase !important;
    color: #9aa0b4 !important;
    padding: 8px 16px !important;
  }

  .job-detail-page .ant-tabs-tab-active .ant-tabs-tab-btn {
    color: #d4870a !important;
  }

  .job-detail-page .ant-tabs-ink-bar {
    background: #d4870a !important;
  }

  .job-detail-page .ant-tabs-nav::before {
    border-bottom-color: #2e3550 !important;
  }

  .job-detail-page .ant-tabs-content-holder {
    padding-top: 20px;
  }

  .jd-card {
    background: #1e2436;
    border: 1px solid #2e3550;
    border-radius: 6px;
    padding: 20px 24px;
    margin-bottom: 16px;
  }

  .jd-section-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #4a5060;
    border-bottom: 1px solid #252c42;
    padding-bottom: 6px;
    margin-bottom: 16px;
  }

  .jd-fields-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 24px;
  }

  .jd-fields-grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 14px 24px;
  }

  .jd-field-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #4a5060;
    margin-bottom: 3px;
  }

  .jd-field-value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: #f0ede8;
    word-break: break-word;
  }

  .jd-field-value.muted {
    color: #9aa0b4;
    font-style: italic;
  }

  .jd-field-value.badge {
    display: inline-block;
    background: #252c42;
    border-radius: 3px;
    padding: 2px 8px;
    font-size: 12px;
  }

  .jd-insurance-yes {
    color: #d4870a;
    font-weight: 700;
  }

  .jd-insurance-no {
    color: #4a5060;
  }
`;

function FieldValue({ value, empty = '—', className }) {
  if (value == null || value === '') {
    return <div className={`jd-field-value muted ${className || ''}`}>{empty}</div>;
  }
  return <div className={`jd-field-value ${className || ''}`}>{value}</div>;
}

const r2 = (n) => Math.round(n * 100) / 100;
const fmt$ = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function KpiCard({ label, value, valueColor }) {
  return (
    <div style={{ background: '#0f1320', border: '1px solid #2e3550', borderRadius: 6, padding: '14px 18px' }}>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a5060', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 700, color: valueColor || '#f0ede8' }}>{value}</div>
    </div>
  );
}

function JobLocationMap({ lat, lng }) {
  if (!lat || !lng) return null;
  const latF = parseFloat(lat);
  const lngF = parseFloat(lng);
  if (isNaN(latF) || isNaN(lngF)) return null;
  return (
    <div style={{ height: 180, borderRadius: 4, overflow: 'hidden', border: '1px solid #2e3550', marginBottom: 4 }}>
      <MapContainer
        center={[latF, lngF]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[latF, lngF]} />
      </MapContainer>
    </div>
  );
}

function DashboardTab({ job, jobId }) {
  const queryClient = useQueryClient();
  const [insuranceSaving, setInsuranceSaving] = useState(false);

  const formatDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return `${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCDate().toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
  };

  const { data: budgetEntries = [] } = useQuery({
    queryKey: ['budget', jobId],
    queryFn: async () => { const { data } = await client.get(`/jobs/${jobId}/budget`); return data; },
    enabled: !!jobId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', jobId],
    queryFn: async () => { const { data } = await client.get(`/jobs/${jobId}/expenses`); return data; },
    enabled: !!jobId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', jobId],
    queryFn: async () => { const { data } = await client.get(`/jobs/${jobId}/documents`); return data; },
    enabled: !!jobId,
  });

  const { data: projectManagers = [] } = useQuery({
    queryKey: ['project-managers'],
    queryFn: async () => { const { data } = await client.get('/project-managers'); return data; },
  });

  const doSave = async (fields) => {
    try {
      await client.put(`/jobs/${jobId}`, fields);
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-jobs'] });
      message.success('Saved');
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to save');
      throw err;
    }
  };

  const INVOICE_TYPES = ['Deposit', 'Invoice', 'Progress Invoice'];

  const kpis = useMemo(() => {
    const items = budgetEntries.filter((e) => e.type === 'item');
    const budgetedRevenue = items.reduce((s, e) => s + (e.ext_price != null ? Number(e.ext_price) : 0), 0);
    const actualCost = r2(expenses.reduce((s, e) => s + Number(e.amount), 0));
    const actualProfit = r2(budgetedRevenue - actualCost);
    const actualMargin = budgetedRevenue !== 0 ? r2((actualProfit / budgetedRevenue) * 100) : null;
    const collected = r2(documents
      .filter((d) => d.paid_at && INVOICE_TYPES.includes(d.type))
      .reduce((s, d) => s + Number(d.total_price || 0), 0));
    return { budgetedRevenue, actualCost, actualProfit, actualMargin, collected };
  }, [budgetEntries, expenses, documents]);

  const marginColor = kpis.actualMargin == null ? undefined : kpis.actualMargin >= 40 ? '#3db87a' : '#e85555';

  const viewedDocs = documents
    .filter((d) => d.customer_viewed_at)
    .sort((a, b) => new Date(b.customer_viewed_at) - new Date(a.customer_viewed_at));

  const textInput = (draft, setDraft, props = {}) => (
    <Input value={draft ?? ''} onChange={(e) => setDraft(e.target.value)} autoFocus {...props} />
  );

  const textareaInput = (draft, setDraft, rows = 2) => (
    <Input.TextArea
      value={draft ?? ''}
      onChange={(e) => setDraft(e.target.value)}
      rows={rows}
      autoFocus
      style={{ resize: 'none' }}
    />
  );

  const categoryInput = (category) => (draft, setDraft) => (
    <CategorySelect
      category={category}
      value={draft}
      onChange={setDraft}
      allowClear
      style={{ width: '100%' }}
    />
  );

  return (
    <div>
      {/* Financial KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Budgeted Revenue" value={fmt$(kpis.budgetedRevenue)} />
        <KpiCard label="Actual Cost" value={fmt$(kpis.actualCost)} />
        <KpiCard label="Collected" value={fmt$(kpis.collected)} />
        <KpiCard label="Actual Profit" value={fmt$(kpis.actualProfit)} valueColor={marginColor} />
        <KpiCard label="Actual Margin" value={kpis.actualMargin != null ? `${kpis.actualMargin.toFixed(1)}%` : '—'} valueColor={marginColor} />
      </div>

      {/* Document activity */}
      {viewedDocs.length > 0 && (
        <div className="jd-card" style={{ marginBottom: 16 }}>
          <div className="jd-section-title">Document Activity</div>
          {viewedDocs.map((d) => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1e2436', fontSize: 13, color: '#f0ede8' }}>
              <span>
                <span style={{ color: '#9aa0b4' }}>{d.title || d.type}</span>
                {' '}viewed{job?.primary_contact_name ? ` by ${job.primary_contact_name}` : ''}
              </span>
              <span style={{ color: '#4a5060', fontSize: 11 }}>{new Date(d.customer_viewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          ))}
        </div>
      )}

      {/* Customer */}
      <div className="jd-card">
        <div className="jd-section-title">Customer</div>
        <div className="jd-fields-grid">
          <div>
            <div className="jd-field-label">Account Name</div>
            <EditableField
              value={job.account_name}
              renderDisplay={(val) => <FieldValue value={val} />}
              renderInput={(draft, setDraft) => textInput(draft, setDraft)}
              onSave={(val) => doSave({ account_name: val || null })}
            />
          </div>
          <div>
            <div className="jd-field-label">Appointment</div>
            <EditableField
              value={job.appointment ? job.appointment.split('T')[0] : null}
              renderDisplay={(val) => <FieldValue value={formatDate(val)} />}
              renderInput={(draft, setDraft) => (
                <DatePicker
                  value={draft ? dayjs(draft) : null}
                  onChange={(d) => setDraft(d ? d.format('YYYY-MM-DD') : null)}
                  format="MM/DD/YYYY"
                  style={{ width: '100%' }}
                />
              )}
              onSave={(val) => doSave({ appointment: val })}
            />
          </div>
          <div>
            <div className="jd-field-label">Type</div>
            {job.account_name ? (
              <EditableField
                value={job.customer_type}
                renderDisplay={(val) => <FieldValue value={val} className="badge" />}
                renderInput={categoryInput('customer_type')}
                onSave={(val) => doSave({ account_name: job.account_name, customer_type: val ?? null })}
              />
            ) : (
              <FieldValue value={job.customer_type} className="badge" />
            )}
          </div>
          <div>
            <div className="jd-field-label">Lead Source</div>
            {job.account_name ? (
              <EditableField
                value={job.lead_source}
                renderDisplay={(val) => <FieldValue value={val} className="badge" />}
                renderInput={categoryInput('lead_source')}
                onSave={(val) => doSave({ account_name: job.account_name, lead_source: val ?? null })}
              />
            ) : (
              <FieldValue value={job.lead_source} className="badge" />
            )}
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="jd-card">
        <div className="jd-section-title">Location</div>
        <div style={{ marginBottom: 14 }}>
          <div className="jd-field-label">Address</div>
          <EditableField
            value={job.address}
            renderDisplay={(val) => <FieldValue value={val} />}
            renderInput={(draft, setDraft) => textInput(draft, setDraft)}
            onSave={(val) => doSave({ address: val || null })}
          />
        </div>
        <JobLocationMap key={`${job.lat},${job.lng}`} lat={job.lat} lng={job.lng} />
        <div className="jd-fields-grid" style={{ marginTop: 14 }}>
          <div>
            <div className="jd-field-label">Entry Code</div>
            <EditableField
              value={job.entry_code}
              renderDisplay={() => (
                job.entry_code
                  ? <div className="jd-field-value" style={{ letterSpacing: '0.2em', color: '#4a5060' }}>••••••</div>
                  : <div className="jd-field-value muted">—</div>
              )}
              renderInput={(draft, setDraft) => textInput(draft, setDraft, { placeholder: 'e.g. 1234' })}
              onSave={(val) => doSave({ entry_code: val || null })}
            />
          </div>
          <div>
            <div className="jd-field-label">Foundation Type</div>
            <EditableField
              value={job.foundation_type}
              renderDisplay={(val) => <FieldValue value={val} className="badge" />}
              renderInput={categoryInput('foundation_type')}
              onSave={(val) => doSave({ foundation_type: val ?? null })}
            />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="jd-field-label">Location Notes</div>
          <EditableField
            value={job.location_notes}
            renderDisplay={(val) => <FieldValue value={val} />}
            renderInput={(draft, setDraft) => textareaInput(draft, setDraft)}
            onSave={(val) => doSave({ location_notes: val || null })}
          />
        </div>
      </div>

      {/* Primary Contact */}
      <div className="jd-card">
        <div className="jd-section-title">Primary Contact</div>
        <div className="jd-fields-grid-3">
          <div>
            <div className="jd-field-label">Name</div>
            <EditableField
              value={job.primary_contact_name}
              renderDisplay={(val) => <FieldValue value={val} />}
              renderInput={(draft, setDraft) => textInput(draft, setDraft)}
              onSave={(val) => doSave({ primary_contact_name: val || null })}
            />
          </div>
          <div>
            <div className="jd-field-label">Email</div>
            <EditableField
              value={job.primary_contact_email}
              renderDisplay={(val) => <FieldValue value={val} />}
              renderInput={(draft, setDraft) => textInput(draft, setDraft)}
              onSave={(val) => doSave({ primary_contact_email: val || null })}
            />
          </div>
          <div>
            <div className="jd-field-label">Phone</div>
            <EditableField
              value={job.primary_contact_phone}
              renderDisplay={(val) => <FieldValue value={val} />}
              renderInput={(draft, setDraft) => textInput(draft, setDraft)}
              onSave={(val) => doSave({ primary_contact_phone: val || null })}
            />
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="jd-card">
        <div className="jd-section-title">Job Details</div>
        <div style={{ marginBottom: 14 }}>
          <div className="jd-field-label">Job Name</div>
          <EditableField
            value={job.job_name}
            renderDisplay={(val) => <FieldValue value={val} />}
            renderInput={(draft, setDraft) => textInput(draft, setDraft)}
            onSave={(val) => doSave({ job_name: val })}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="jd-field-label">Description</div>
          <EditableField
            value={job.description}
            renderDisplay={(val) => <FieldValue value={val} />}
            renderInput={(draft, setDraft) => textareaInput(draft, setDraft, 3)}
            onSave={(val) => doSave({ description: val || null })}
          />
        </div>
        <div className="jd-fields-grid">
          <div>
            <div className="jd-field-label">Customer PO</div>
            <EditableField
              value={job.customer_po}
              renderDisplay={(val) => <FieldValue value={val} />}
              renderInput={(draft, setDraft) => textInput(draft, setDraft)}
              onSave={(val) => doSave({ customer_po: val || null })}
            />
          </div>
          <div>
            <div className="jd-field-label">Job Type</div>
            <EditableField
              value={job.job_type}
              renderDisplay={(val) => <FieldValue value={val} className="badge" />}
              renderInput={categoryInput('job_type')}
              onSave={(val) => doSave({ job_type: val ?? null })}
            />
          </div>
          <div>
            <div className="jd-field-label">Project Manager</div>
            <EditableField
              value={job.project_manager_id}
              renderDisplay={() => <FieldValue value={job.project_manager_name} />}
              renderInput={(draft, setDraft) => (
                <Select
                  value={draft}
                  onChange={setDraft}
                  allowClear
                  placeholder="Select PM"
                  style={{ width: '100%' }}
                >
                  {projectManagers.map((pm) => (
                    <Select.Option key={pm.id} value={pm.id}>{pm.name}</Select.Option>
                  ))}
                </Select>
              )}
              onSave={(val) => doSave({ project_manager_id: val ?? null })}
            />
          </div>
          <div>
            <div className="jd-field-label">Insurance Claim</div>
            <Switch
              checked={!!job.insurance_claim}
              loading={insuranceSaving}
              onChange={async (checked) => {
                setInsuranceSaving(true);
                try { await doSave({ insurance_claim: checked }); } catch {}
                setInsuranceSaving(false);
              }}
              checkedChildren="Yes"
              unCheckedChildren="No"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: 'new_lead',             label: 'New Lead',              color: '#d4870a' },
  { value: 'inspection_scheduled', label: 'Inspection Scheduled',  color: '#d4870a' },
  { value: 'inspected',            label: 'Inspected',             color: '#d4870a' },
  { value: 'bid_in_progress',      label: 'Bid In Progress',       color: '#3db87a' },
  { value: 'bid_sent',             label: 'Bid Sent',              color: '#4a90d9' },
  { value: 'follow_up',            label: 'Follow-Up',             color: '#4a90d9' },
  { value: 'active',               label: 'Active',                color: '#3db87a' },
  { value: 'pending_permit',       label: 'Pending Permit',        color: '#d4870a' },
  { value: 'completed',            label: 'Completed',             color: '#9aa0b4' },
];

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const { data } = await client.get(`/jobs/${id}`);
      return data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const { data } = await client.put(`/jobs/${id}`, { status: newStatus });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-jobs'] });
    },
  });

  const jobNumber = job?.job_number_formatted
    ? `JOB #${job.job_number_formatted}`
    : job?.job_number
    ? `JOB #${String(job.job_number).padStart(4, '0')}`
    : '';

  return (
    <>
      <style>{pageStyles}</style>
      <style>{efStyles}</style>
      <div className="job-detail-page">
        <div className="job-detail-header">
          <button className="job-detail-back-btn" onClick={() => navigate('/jobs/active')}>
            <ArrowLeftOutlined /> Jobs
          </button>
          {job && (
            <>
              <span className="job-detail-job-number">{jobNumber}</span>
              <span className="job-detail-job-name">{job.job_name}</span>
              <Select
                value={job.status}
                onChange={(val) => statusMutation.mutate(val)}
                loading={statusMutation.isPending}
                size="small"
                style={{ width: 170, flexShrink: 0 }}
                options={STATUS_OPTIONS.map((s) => ({
                  value: s.value,
                  label: (
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: '0.06em', color: s.color }}>
                      {s.label}
                    </span>
                  ),
                }))}
              />
              <Button
                icon={<EditOutlined />}
                onClick={() => setEditOpen(true)}
                style={{
                  background: '#252c42',
                  borderColor: '#2e3550',
                  color: '#9aa0b4',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  height: 32,
                }}
              >
                Edit Job
              </Button>
            </>
          )}
        </div>

        <div className="job-detail-body">
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Spin size="large" />
            </div>
          )}

          {isError && (
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 16,
                color: '#e85555',
                padding: 20,
              }}
            >
              Failed to load job. It may not exist.
            </div>
          )}

          {job && (
            <Tabs
              defaultActiveKey="dashboard"
              items={[
                {
                  key: 'dashboard',
                  label: 'Dashboard',
                  children: <DashboardTab job={job} jobId={id} />,
                },
                {
                  key: 'budget',
                  label: 'Budget',
                  children: <BudgetTab jobId={id} />,
                },
                {
                  key: 'documents',
                  label: 'Documents',
                  children: <DocumentsTab jobId={id} />,
                },
                {
                  key: 'expenses',
                  label: 'Expenses',
                  children: <ExpensesTab jobId={id} />,
                },
                {
                  key: 'reports',
                  label: 'Reports',
                  children: <ReportsTab jobId={id} job={job} />,
                },
                {
                  key: 'contacts',
                  label: 'Contacts',
                  children: <ContactsTab jobId={id} />,
                },
                {
                  key: 'files',
                  label: 'Files',
                  children: <FilesTab jobId={id} />,
                },
              ]}
            />
          )}
        </div>
      </div>

      <JobFormModal
        open={editOpen}
        selectedJob={job ? { id: job.id } : null}
        onClose={() => {
          setEditOpen(false);
          queryClient.invalidateQueries({ queryKey: ['job', id] });
        }}
      />
    </>
  );
}

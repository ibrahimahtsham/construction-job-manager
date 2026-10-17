import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  DatePicker,
  Row,
  Col,
  Button,
  Space,
  AutoComplete,
  Tooltip,
  Divider,
  message,
} from 'antd';
import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import client from '../../api/client.js';
import CategorySelect from '../common/CategorySelect.jsx';
import LocationPicker from '../common/LocationPicker.jsx';

const { TextArea } = Input;
const { Option } = Select;

const modalStyles = `
  .summit-job-modal .ant-modal-content {
    background: #1e2436;
    border: 1px solid #2e3550;
    border-radius: 6px;
    padding: 0;
  }

  .summit-job-modal .ant-modal-header {
    background: #141826;
    border-bottom: 1px solid #2e3550;
    border-radius: 6px 6px 0 0;
    padding: 16px 24px;
    margin-bottom: 0;
  }

  .summit-job-modal .ant-modal-title {
    font-family: 'Barlow Condensed', sans-serif !important;
    font-size: 18px !important;
    font-weight: 700 !important;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #f0ede8 !important;
  }

  .summit-job-modal .ant-modal-body {
    padding: 24px;
    max-height: 70vh;
    overflow-y: auto;
  }

  .summit-job-modal .ant-modal-footer {
    background: #141826;
    border-top: 1px solid #2e3550;
    border-radius: 0 0 6px 6px;
    padding: 12px 24px;
    margin-top: 0;
  }

  .summit-job-modal .ant-form-item-label label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #9aa0b4 !important;
  }

  .summit-job-modal .ant-input,
  .summit-job-modal .ant-input-affix-wrapper,
  .summit-job-modal .ant-input-password,
  .summit-job-modal textarea.ant-input {
    background: #141826 !important;
    border-color: #2e3550 !important;
    color: #f0ede8 !important;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    border-radius: 4px;
  }

  .summit-job-modal .ant-input:focus,
  .summit-job-modal .ant-input-affix-wrapper-focused,
  .summit-job-modal textarea.ant-input:focus {
    border-color: #d4870a !important;
    box-shadow: 0 0 0 2px rgba(212, 135, 10, 0.12) !important;
  }

  .summit-job-modal .ant-select .ant-select-selector,
  .summit-job-modal .ant-select-auto-complete .ant-select-selector {
    background: #141826 !important;
    border-color: #2e3550 !important;
    color: #f0ede8 !important;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }

  .summit-job-modal .ant-select-focused .ant-select-selector {
    border-color: #d4870a !important;
    box-shadow: 0 0 0 2px rgba(212, 135, 10, 0.12) !important;
  }

  .summit-job-modal .ant-picker {
    background: #141826 !important;
    border-color: #2e3550 !important;
    width: 100%;
    border-radius: 4px;
  }

  .summit-job-modal .ant-picker input {
    color: #f0ede8 !important;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }

  .summit-job-modal .ant-picker-focused {
    border-color: #d4870a !important;
    box-shadow: 0 0 0 2px rgba(212, 135, 10, 0.12) !important;
  }

  .summit-job-modal .ant-picker-suffix,
  .summit-job-modal .ant-picker-clear {
    color: #4a5060 !important;
  }

  .summit-form-section-divider {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #4a5060;
    border-bottom: 1px solid #252c42;
    padding-bottom: 6px;
    margin: 4px 0 16px 0;
  }

  .summit-pm-add-input {
    background: #141826 !important;
    border-color: #2e3550 !important;
    color: #f0ede8 !important;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }
`;

async function createJob(data) {
  const { data: res } = await client.post('/jobs', data);
  return res;
}

async function updateJob({ id, ...data }) {
  const { data: res } = await client.put(`/jobs/${id}`, data);
  return res;
}

const PIPELINE_STAGES = new Set(['new_lead','inspection_scheduled','inspected','bid_in_progress','bid_sent','follow_up','lost','no_value']);

function JobFormModal({ open, onClose, selectedJob, defaultStatus = 'active' }) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEdit = Boolean(selectedJob);

  // Customer autocomplete state
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  // Map pin state
  const [pinLat, setPinLat] = useState(null);
  const [pinLng, setPinLng] = useState(null);

  // PM inline-add state
  const [newPmName, setNewPmName] = useState('');
  const [pmDropdownOpen, setPmDropdownOpen] = useState(false);
  const newPmInputRef = useRef(null);

  // Address autocomplete state
  const [addressOptions, setAddressOptions] = useState([]);
  const addressDebounceRef = useRef(null);

  const searchAddress = useCallback((value) => {
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    if (!value || value.length < 3) { setAddressOptions([]); return; }
    addressDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&addressdetails=1&countrycodes=us&limit=6`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setAddressOptions(
          data.map((item) => ({
            value: item.display_name,
            label: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          }))
        );
      } catch {
        setAddressOptions([]);
      }
    }, 350);
  }, []);

  // Fetch full job details (including entry_code) when editing
  const { data: jobDetail } = useQuery({
    queryKey: ['job', selectedJob?.id],
    queryFn: async () => {
      const { data } = await client.get(`/jobs/${selectedJob.id}`);
      return data;
    },
    enabled: isEdit && open,
  });

  // Fetch saved locations for selected customer
  const { data: savedLocations = [] } = useQuery({
    queryKey: ['locations', selectedCustomerId],
    queryFn: async () => {
      const { data } = await client.get(`/locations?customer_id=${selectedCustomerId}`);
      return data;
    },
    enabled: !!selectedCustomerId && open,
  });

  // Fetch customers for autocomplete
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await client.get('/customers');
      return data;
    },
    enabled: open,
  });

  // Fetch project managers
  const { data: projectManagers = [] } = useQuery({
    queryKey: ['project-managers'],
    queryFn: async () => {
      const { data } = await client.get('/project-managers');
      return data;
    },
    enabled: open,
  });

  // Auto-fill location fields when customer is selected (new job only)
  useEffect(() => {
    if (!isEdit && savedLocations.length > 0) {
      handleLocationSelect(savedLocations[0].id);
    }
  }, [savedLocations, isEdit]);

  const addPmMutation = useMutation({
    mutationFn: async (name) => {
      const { data } = await client.post('/project-managers', { name });
      return data;
    },
    onSuccess: (pm) => {
      queryClient.invalidateQueries({ queryKey: ['project-managers'] });
      form.setFieldValue('project_manager_id', pm.id);
      setNewPmName('');
      setPmDropdownOpen(false);
    },
  });

  useEffect(() => {
    if (open) {
      if (isEdit && jobDetail) {
        setSelectedCustomerId(jobDetail.customer_id || null);
        setPinLat(jobDetail.lat ? parseFloat(jobDetail.lat) : null);
        setPinLng(jobDetail.lng ? parseFloat(jobDetail.lng) : null);
        form.setFieldsValue({
          job_name: jobDetail.job_name,
          description: jobDetail.description,
          customer_po: jobDetail.customer_po,
          job_type: jobDetail.job_type,
          insurance_claim: jobDetail.insurance_claim ?? false,
          account_name: jobDetail.account_name || '',
          customer_type: jobDetail.customer_type,
          lead_source: jobDetail.lead_source,
          appointment: jobDetail.appointment ? dayjs(jobDetail.appointment) : null,
          address: jobDetail.address,
          entry_code: jobDetail.entry_code,
          foundation_type: jobDetail.foundation_type,
          location_notes: jobDetail.location_notes,
          primary_contact_name: jobDetail.primary_contact_name,
          primary_contact_email: jobDetail.primary_contact_email,
          primary_contact_phone: jobDetail.primary_contact_phone,
          project_manager_id: jobDetail.project_manager_id,
        });
      } else if (!isEdit) {
        setSelectedCustomerId(null);
        setSelectedLocationId(null);
        setPinLat(null);
        setPinLng(null);
        form.resetFields();
        form.setFieldValue('appointment', dayjs());
      }
    }
  }, [open, isEdit, jobDetail, form]);

  const mutation = useMutation({
    mutationFn: isEdit ? updateJob : createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      form.resetFields();
      setSelectedCustomerId(null);
      setSelectedLocationId(null);
      setPinLat(null);
      setPinLng(null);
      onClose();
    },
    onError: (err) => {
      message.error(err.response?.data?.error || 'Failed to save job');
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const appointment = values.appointment ? values.appointment.format('YYYY-MM-DD') : undefined;

      const payload = {
        ...values,
        appointment,
        customer_id: selectedCustomerId || undefined,
        location_id: selectedLocationId || undefined,
        lat: pinLat || undefined,
        lng: pinLng || undefined,
      };

      if (isEdit) {
        mutation.mutate({ id: selectedJob.id, ...payload });
      } else {
        mutation.mutate({ ...payload, status: defaultStatus });
      }
    } catch (_) {
      // validation error — form shows inline messages
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedCustomerId(null);
    setSelectedLocationId(null);
    setPinLat(null);
    setPinLng(null);
    onClose();
  };

  const customerOptions = customers.map((c) => ({
    value: c.account_name,
    label: c.account_name,
    customer: c,
  }));

  const handleCustomerSelect = (value, option) => {
    const c = option.customer;
    setSelectedCustomerId(c.id);
    form.setFieldsValue({
      account_name: c.account_name,
      customer_type: c.type,
      lead_source: c.lead_source,
    });
  };

  const handleCustomerChange = (value) => {
    const match = customers.find((c) => c.account_name === value);
    if (!match) {
      setSelectedCustomerId(null);
      setSelectedLocationId(null);
    }
  };

  const handleLocationSelect = async (locationId) => {
    setSelectedLocationId(locationId);
    if (!locationId) {
      setPinLat(null);
      setPinLng(null);
      return;
    }
    try {
      const { data } = await client.get(`/locations/${locationId}`);
      form.setFieldsValue({
        address: data.address,
        entry_code: data.entry_code,
        foundation_type: data.foundation_type,
        location_notes: data.location_notes,
        primary_contact_name: data.primary_contact_name,
        primary_contact_email: data.primary_contact_email,
        primary_contact_phone: data.primary_contact_phone,
      });
      if (data.lat && data.lng) {
        setPinLat(parseFloat(data.lat));
        setPinLng(parseFloat(data.lng));
      }
    } catch (_) {}
  };

  const handleAddPm = () => {
    if (!newPmName.trim()) return;
    addPmMutation.mutate(newPmName.trim());
  };

  return (
    <>
      <style>{modalStyles}</style>
      <Modal
        className="summit-job-modal"
        open={open}
        onCancel={handleCancel}
        width={800}
        title={isEdit ? 'Edit Job' : PIPELINE_STAGES.has(defaultStatus) ? 'New Lead' : 'New Job'}
        destroyOnClose
        footer={
          <Space>
            <Button
              onClick={handleCancel}
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: '#252c42',
                borderColor: '#2e3550',
                color: '#f0ede8',
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={mutation.isPending}
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: '#d4870a',
                borderColor: '#d4870a',
                color: '#0f1320',
                minWidth: 100,
              }}
            >
              {isEdit ? 'Save Changes' : 'Create Job'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark={false} autoComplete="off">

          {/* ── Customer ─────────────────────────────────────────── */}
          <div className="summit-form-section-divider">Customer</div>

          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item name="account_name" label="Account Name">
                <AutoComplete
                  options={customerOptions}
                  onSelect={handleCustomerSelect}
                  onChange={handleCustomerChange}
                  filterOption={(input, option) =>
                    option.value.toLowerCase().includes(input.toLowerCase())
                  }
                  placeholder="Search or enter customer name"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="appointment" label="Appointment">
                <DatePicker format="MM/DD/YYYY" placeholder="Select date" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item name="customer_type" label="Type">
                <CategorySelect category="customer_type" placeholder="Select type" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lead_source" label="Lead Source">
                <CategorySelect category="lead_source" placeholder="Select lead source" allowClear />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Location ─────────────────────────────────────────── */}
          <div className="summit-form-section-divider">Location</div>

          {selectedCustomerId && savedLocations.length > 0 && (
            <Form.Item label="Saved Locations">
              <Select
                placeholder="Select a saved location to autofill..."
                allowClear
                value={selectedLocationId}
                onChange={handleLocationSelect}
              >
                {savedLocations.map((loc) => (
                  <Option key={loc.id} value={loc.id}>
                    {loc.address || `Location ${loc.id.slice(0, 8)}`}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="address" label="Address">
            <AutoComplete
              options={addressOptions}
              onSearch={searchAddress}
              onSelect={(value, option) => {
                if (option.lat) {
                  setPinLat(option.lat);
                  setPinLng(option.lng);
                }
              }}
              placeholder="Start typing an address..."
              filterOption={false}
            />
          </Form.Item>
          <LocationPicker
            lat={pinLat}
            lng={pinLng}
            onChange={(lat, lng, displayName) => {
              setPinLat(lat);
              setPinLng(lng);
              if (displayName) form.setFieldValue('address', displayName);
            }}
          />

          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item
                name="entry_code"
                label={
                  <span>
                    Entry Code&nbsp;
                    <Tooltip title="Encrypted at rest — never shown in list view">
                      <InfoCircleOutlined style={{ color: '#4a5060', fontSize: 12 }} />
                    </Tooltip>
                  </span>
                }
              >
                <Input placeholder="e.g. 1234" autoComplete="off" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="foundation_type" label="Foundation Type">
                <CategorySelect category="foundation_type" placeholder="Select foundation type" allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="location_notes" label="Location Notes">
            <TextArea rows={2} placeholder="Gate codes, parking notes, etc." style={{ resize: 'none' }} />
          </Form.Item>

          {/* ── Primary Contact ──────────────────────────────────── */}
          <div className="summit-form-section-divider">Primary Contact</div>

          <Row gutter={[16, 0]}>
            <Col span={8}>
              <Form.Item name="primary_contact_name" label="Name">
                <Input placeholder="Full name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="primary_contact_email" label="Email">
                <Input placeholder="email@example.com" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="primary_contact_phone" label="Phone">
                <Input placeholder="(555) 000-0000" />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Job Details ──────────────────────────────────────── */}
          <div className="summit-form-section-divider">Job Details</div>

          <Row gutter={[16, 0]}>
            <Col span={16}>
              <Form.Item
                name="job_name"
                label="Name"
                rules={[{ required: true, message: 'Job name is required' }]}
              >
                <Input placeholder="Enter job name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="customer_po" label="Customer PO">
                <Input placeholder="PO number" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Brief job description..." style={{ resize: 'none' }} />
          </Form.Item>

          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item name="job_type" label="Job Type">
                <CategorySelect category="job_type" placeholder="Select job type" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="project_manager_id" label="Project Manager">
                <Select
                  placeholder="Select PM"
                  allowClear
                  open={pmDropdownOpen}
                  onDropdownVisibleChange={setPmDropdownOpen}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '4px 0', borderColor: '#2e3550' }} />
                      <div style={{ padding: '8px 8px 4px', display: 'flex', gap: 8 }}>
                        <input
                          ref={newPmInputRef}
                          className="summit-pm-add-input"
                          value={newPmName}
                          onChange={(e) => setNewPmName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddPm()}
                          placeholder="New PM name"
                          style={{
                            flex: 1,
                            background: '#141826',
                            border: '1px solid #2e3550',
                            borderRadius: 4,
                            color: '#f0ede8',
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 13,
                            padding: '4px 8px',
                            outline: 'none',
                          }}
                        />
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          onClick={handleAddPm}
                          loading={addPmMutation.isPending}
                          style={{ color: '#d4870a', padding: '0 8px' }}
                        >
                          Add
                        </Button>
                      </div>
                    </>
                  )}
                >
                  {projectManagers.map((pm) => (
                    <Option key={pm.id} value={pm.id}>
                      {pm.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="insurance_claim" label="Insurance Claim" valuePropName="checked">
            <Switch
              checkedChildren="Yes"
              unCheckedChildren="No"
              style={{ '--switch-checked-bg': '#d4870a' }}
            />
          </Form.Item>

        </Form>
      </Modal>
    </>
  );
}

export default JobFormModal;

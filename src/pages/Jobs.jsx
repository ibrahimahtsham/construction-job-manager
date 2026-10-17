import React, { useState } from 'react';
import { Button, Tabs } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import JobsTable from '../components/jobs/JobsTable.jsx';
import JobFormModal from '../components/jobs/JobFormModal.jsx';
import PipelineBoard from '../components/jobs/PipelineBoard.jsx';

const tabStyles = `
  .summit-jobs-tabs .ant-tabs-nav { margin-bottom: 20px; border-bottom: 1px solid #2e3550; }
  .summit-jobs-tabs .ant-tabs-tab { font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #4a5060; padding: 8px 0; margin-right: 28px; }
  .summit-jobs-tabs .ant-tabs-tab:hover { color: #9aa0b4 !important; }
  .summit-jobs-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn { color: #f0ede8 !important; }
  .summit-jobs-tabs .ant-tabs-ink-bar { background: #d4870a !important; }
  .summit-jobs-tabs .ant-tabs-nav::before { border-bottom: none !important; }
`;

function Jobs() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  const handleEdit = (job) => {
    setSelectedJob(job);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setSelectedJob(null);
  };

  const tabItems = [
    {
      key: 'pipeline',
      label: 'Pipeline',
      children: <PipelineBoard />,
    },
    {
      key: 'active',
      label: 'Active Jobs',
      children: (
        <JobsTable
          onEdit={handleEdit}
          statusFilter={['active', 'pending_permit']}
        />
      ),
    },
    {
      key: 'completed',
      label: 'Completed',
      children: (
        <JobsTable
          onEdit={handleEdit}
          statusFilter={['completed']}
        />
      ),
    },
  ];

  return (
    <>
      <style>{tabStyles}</style>
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#f0ede8',
                margin: 0,
                lineHeight: 1,
                textTransform: 'uppercase',
              }}
            >
              Jobs
            </h1>
            <div style={{ width: 3, height: 28, background: '#d4870a', borderRadius: 1 }} />
          </div>

          {activeTab === 'active' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setSelectedJob(null); setModalOpen(true); }}
              style={{
                background: '#d4870a', borderColor: '#d4870a', color: '#0f1320',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase',
                height: 38, padding: '0 20px', borderRadius: 4,
              }}
            >
              New Job
            </Button>
          )}
        </div>

        <Tabs
          className="summit-jobs-tabs"
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        <JobFormModal
          open={modalOpen}
          onClose={handleClose}
          selectedJob={selectedJob}
        />
      </div>
    </>
  );
}

export default Jobs;

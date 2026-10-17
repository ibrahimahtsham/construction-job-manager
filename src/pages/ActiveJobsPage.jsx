import React, { useState } from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import JobsTable from '../components/jobs/JobsTable.jsx';
import JobFormModal from '../components/jobs/JobFormModal.jsx';

function ActiveJobsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const handleEdit = (job) => { setSelectedJob(job); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setSelectedJob(null); };

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 28, fontWeight: 700, letterSpacing: '0.12em',
            color: '#f0ede8', margin: 0, lineHeight: 1, textTransform: 'uppercase',
          }}>
            Active Jobs
          </h1>
          <div style={{ width: 3, height: 28, background: '#d4870a', borderRadius: 1 }} />
        </div>
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
      </div>

      <JobsTable onEdit={handleEdit} statusFilter={['active', 'pending_permit']} />

      <JobFormModal open={modalOpen} onClose={handleClose} selectedJob={selectedJob} />
    </div>
  );
}

export default ActiveJobsPage;

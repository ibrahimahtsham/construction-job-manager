import React, { useState } from 'react';
import JobsTable from '../components/jobs/JobsTable.jsx';
import JobFormModal from '../components/jobs/JobFormModal.jsx';

function CompletedJobsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const handleEdit = (job) => { setSelectedJob(job); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setSelectedJob(null); };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 28, fontWeight: 700, letterSpacing: '0.12em',
          color: '#f0ede8', margin: 0, lineHeight: 1, textTransform: 'uppercase',
        }}>
          Completed
        </h1>
        <div style={{ width: 3, height: 28, background: '#d4870a', borderRadius: 1 }} />
      </div>

      <JobsTable onEdit={handleEdit} statusFilter={['completed']} />

      <JobFormModal open={modalOpen} onClose={handleClose} selectedJob={selectedJob} />
    </div>
  );
}

export default CompletedJobsPage;

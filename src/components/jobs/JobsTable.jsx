import React, { useState, useMemo } from 'react';
import { Table, Input, Empty } from 'antd';
import { SearchOutlined, CloseCircleFilled } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client.js';
import { getJobColumns } from './JobColumns.jsx';

const tableStyles = `
  .summit-jobs-table .ant-table {
    background: #1e2436;
    font-family: 'Barlow', sans-serif;
  }

  .summit-jobs-table .ant-table-thead > tr > th {
    background: #141826 !important;
    color: #9aa0b4 !important;
    font-family: 'Barlow Condensed', sans-serif !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    letter-spacing: 0.1em !important;
    text-transform: uppercase;
    border-bottom: 1px solid #2e3550 !important;
    border-right: none !important;
    padding: 10px 12px !important;
  }

  .summit-jobs-table .ant-table-tbody > tr > td {
    border-bottom: 1px solid #252c42 !important;
    border-right: none !important;
    padding: 10px 12px !important;
    color: #f0ede8;
  }

  .summit-jobs-table .ant-table-tbody > tr:hover > td {
    background: #252c42 !important;
  }

  .summit-jobs-table .ant-table-tbody > tr:hover .job-name-cell {
    color: #d4870a !important;
  }

  .summit-jobs-table .ant-table-footer,
  .summit-jobs-table .ant-table-summary {
    background: #141826;
  }

  .summit-jobs-table .ant-pagination {
    padding: 12px 0;
  }

  .summit-jobs-table .ant-pagination-item {
    background: #1e2436;
    border-color: #2e3550;
  }

  .summit-jobs-table .ant-pagination-item a {
    color: #9aa0b4;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
  }

  .summit-jobs-table .ant-pagination-item-active {
    background: #d4870a !important;
    border-color: #d4870a !important;
  }

  .summit-jobs-table .ant-pagination-item-active a {
    color: #0f1320 !important;
  }

  .summit-jobs-table .ant-table-column-sorter {
    color: #4a5060;
  }

  .summit-jobs-table .ant-table-column-sorter-up.active,
  .summit-jobs-table .ant-table-column-sorter-down.active {
    color: #d4870a;
  }

  .summit-search-bar .ant-input-search .ant-input {
    background: #1e2436 !important;
    border-color: #2e3550 !important;
    color: #f0ede8;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    height: 36px;
  }

  .summit-search-bar .ant-input-search .ant-input:focus {
    border-color: #d4870a !important;
    box-shadow: 0 0 0 2px rgba(212, 135, 10, 0.12) !important;
  }

  .summit-search-bar .ant-input-search-button {
    background: #1e2436 !important;
    border-color: #2e3550 !important;
    color: #9aa0b4 !important;
    height: 36px !important;
  }

  .summit-search-bar .ant-input-affix-wrapper {
    background: #1e2436 !important;
    border-color: #2e3550 !important;
  }

  .summit-search-bar .ant-input-affix-wrapper-focused {
    border-color: #d4870a !important;
    box-shadow: 0 0 0 2px rgba(212, 135, 10, 0.12) !important;
  }

  .summit-search-bar .ant-input-affix-wrapper input {
    background: #1e2436 !important;
    color: #f0ede8 !important;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }
`;

async function fetchJobs(statusFilter) {
  const params = statusFilter?.length ? `?status=${statusFilter.join(',')}` : '';
  const { data } = await client.get(`/jobs${params}`);
  return data;
}

async function deleteJob(id) {
  await client.delete(`/jobs/${id}`);
}

function JobsTable({ onEdit, statusFilter }) {
  const [searchText, setSearchText] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', statusFilter?.join(',') ?? 'all'],
    queryFn: () => fetchJobs(statusFilter),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const filteredJobs = useMemo(() => {
    if (!searchText.trim()) return jobs;
    const q = searchText.toLowerCase();
    return jobs.filter(
      (j) =>
        (j.job_name || '').toLowerCase().includes(q) ||
        (j.account_name || '').toLowerCase().includes(q) ||
        (j.job_number || '').toLowerCase().includes(q) ||
        (j.address || '').toLowerCase().includes(q)
    );
  }, [jobs, searchText]);

  const columns = getJobColumns({
    onEdit,
    onDelete: (id) => deleteMutation.mutate(id),
    showStatus: !!statusFilter,
  });

  return (
    <>
      <style>{tableStyles}</style>

      <div style={{ marginBottom: 16 }} className="summit-search-bar">
        <Input
          placeholder="Search by job #, name, customer, address..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          prefix={<SearchOutlined style={{ color: '#4a5060' }} />}
          suffix={searchText ? <CloseCircleFilled style={{ color: '#4a5060', cursor: 'pointer' }} onClick={() => setSearchText('')} /> : null}
          style={{ width: 320 }}
        />
        {searchText && (
          <span
            style={{
              marginLeft: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              color: '#4a5060',
            }}
          >
            {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="summit-jobs-table">
        <Table
          columns={columns}
          dataSource={filteredJobs}
          rowKey="id"
          loading={isLoading}
          size="middle"
          scroll={{ x: 1600 }}
          onRow={(record) => ({
            onClick: () => navigate(`/jobs/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            defaultPageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => (
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: '#9aa0b4',
                }}
              >
                {total} job{total !== 1 ? 's' : ''}
              </span>
            ),
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 14,
                      letterSpacing: '0.08em',
                      color: '#4a5060',
                    }}
                  >
                    No jobs yet. Add your first job above.
                  </span>
                }
                style={{ padding: '40px 0' }}
              />
            ),
          }}
          style={{ background: '#1e2436' }}
        />
      </div>
    </>
  );
}

export default JobsTable;

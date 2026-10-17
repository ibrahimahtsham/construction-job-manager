import React, { useState, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Button, message, Switch } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';
import PipelineCard from './PipelineCard.jsx';
import JobFormModal from './JobFormModal.jsx';

const PIPELINE_STATUSES = [
  'new_lead',
  'inspection_scheduled',
  'inspected',
  'bid_in_progress',
  'bid_sent',
  'follow_up',
  'lost',
  'no_value',
].join(',');

const STAGE_COLORS = {
  new_lead:             { color: '#d4870a', headerBg: '#261500' },
  inspection_scheduled: { color: '#d4870a', headerBg: '#261500' },
  inspected:            { color: '#d4870a', headerBg: '#261500' },
  bid_in_progress:      { color: '#3db87a', headerBg: '#0d2018' },
  bid_sent:             { color: '#4a90d9', headerBg: '#0a1828' },
  follow_up:            { color: '#4a90d9', headerBg: '#0a1828' },
  lost:                 { color: '#d45a5a', headerBg: '#2a0c0c' },
  no_value:             { color: '#d45a9a', headerBg: '#2a0c1e' },
};

const ACTIVE_STAGES = [
  { key: 'new_lead',             label: 'New Lead' },
  { key: 'inspection_scheduled', label: 'Inspection Scheduled' },
  { key: 'inspected',            label: 'Inspected' },
  { key: 'bid_in_progress',      label: 'Bid In Progress' },
  { key: 'bid_sent',             label: 'Bid Sent' },
  { key: 'follow_up',            label: 'Follow-Up' },
];

const GRAVEYARD_STAGES = [
  { key: 'lost',     label: 'Lost' },
  { key: 'no_value', label: 'No Value' },
];

const boardStyles = `
  .pipeline-board { overflow-x: auto; padding-bottom: 16px; }
  .pipeline-columns { display: flex; gap: 12px; min-width: max-content; }
  .pipeline-col {
    width: 220px; flex-shrink: 0;
    background: #141826; border: 1px solid #1e2436; border-radius: 6px;
    padding: 0;
  }
  .pipeline-col-header {
    padding: 10px 12px 8px;
    border-bottom: 1px solid #1e2436;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: #9aa0b4;
    display: flex; justify-content: space-between; align-items: center;
  }
  .pipeline-col-body { padding: 8px; min-height: 60px; }
  .pipeline-col-graveyard .pipeline-col-header { color: #4a5060; }
`;

function PipelineBoard() {
  const queryClient = useQueryClient();
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [showGraveyard, setShowGraveyard] = useState(false);
  // Local override for the card being dragged. React useState can be flushed
  // synchronously with flushSync; React Query's setQueryData cannot, because
  // RQ v5 notifies subscribers via microtask (async), so flushSync can't capture it.
  const [dragOverride, setDragOverride] = useState(null); // { id, status } | null

  const { data: serverJobs = [] } = useQuery({
    queryKey: ['pipeline-jobs'],
    queryFn: async () => {
      const { data } = await client.get(`/jobs?status=${PIPELINE_STATUSES}`);
      return data;
    },
  });

  // Overlay the drag override on top of server data so the card visually moves
  // to the new column the instant the user releases, before any server round-trip.
  const jobs = useMemo(
    () => dragOverride
      ? serverJobs.map(j => j.id === dragOverride.id ? { ...j, status: dragOverride.status } : j)
      : serverJobs,
    [serverJobs, dragOverride],
  );

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await client.put(`/jobs/${id}`, { status });
      return data;
    },
    onMutate: async ({ id, status }) => {
      // Keep the RQ cache in sync for non-drag callers (Won / Lost / No Value dropdowns).
      await queryClient.cancelQueries({ queryKey: ['pipeline-jobs'] });
      const previousJobs = queryClient.getQueryData(['pipeline-jobs']);
      queryClient.setQueryData(['pipeline-jobs'], (old) =>
        old ? old.map(j => (j.id === id ? { ...j, status } : j)) : old
      );
      return { previousJobs };
    },
    onError: (err, vars, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(['pipeline-jobs'], context.previousJobs);
      }
      message.error(err.response?.data?.error || 'Failed to update status');
    },
    onSettled: (data, error, { id }) => {
      // Clear drag override once the server has responded (cache is now authoritative).
      setDragOverride(prev => (prev?.id === id ? null : prev));
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const job = jobs.find(j => j.id === draggableId);
    if (!job || job.status === newStatus) return;

    // flushSync on a useState setter forces a synchronous DOM update before this
    // function returns. @hello-pangea/dnd measures card positions for its drop
    // animation after onDragEnd returns — so the card must already be in its new
    // column in the DOM at that point, or the animation targets the old position.
    flushSync(() => setDragOverride({ id: draggableId, status: newStatus }));

    statusMutation.mutate({ id: draggableId, status: newStatus });
  };

  const handleWon = (job) => statusMutation.mutate({ id: job.id, status: 'active' });
  const handleLost = (job) => statusMutation.mutate({ id: job.id, status: 'lost' });
  const handleNoValue = (job) => statusMutation.mutate({ id: job.id, status: 'no_value' });

  const allStages = showGraveyard
    ? [...ACTIVE_STAGES, ...GRAVEYARD_STAGES]
    : ACTIVE_STAGES;

  const byStatus = (statusKey) => jobs.filter(j => j.status === statusKey);

  return (
    <>
      <style>{boardStyles}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setNewLeadOpen(true)}
          style={{
            background: '#d4870a', borderColor: '#d4870a', color: '#0f1320',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase',
            height: 38, padding: '0 20px', borderRadius: 4,
          }}
        >
          New Lead
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4a5060' }}>
            Show Graveyard
          </span>
          <Switch
            checked={showGraveyard}
            onChange={setShowGraveyard}
            size="small"
          />
        </div>
      </div>

      <div className="pipeline-board">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="pipeline-columns">
            {allStages.map((stage) => {
              const cards = byStatus(stage.key);
              const isGraveyard = GRAVEYARD_STAGES.some(s => s.key === stage.key);
              const sc = STAGE_COLORS[stage.key] || {};
              return (
                <div
                  key={stage.key}
                  className={`pipeline-col${isGraveyard ? ' pipeline-col-graveyard' : ''}`}
                  style={{ borderTop: `3px solid ${sc.color || '#2e3550'}` }}
                >
                  <div className="pipeline-col-header" style={{ background: sc.headerBg || undefined }}>
                    <span style={{ color: sc.color || '#9aa0b4' }}>{stage.label}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: sc.color || '#4a5060', opacity: 0.6 }}>
                      {cards.length}
                    </span>
                  </div>
                  <Droppable droppableId={stage.key} isDropDisabled={isGraveyard}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="pipeline-col-body"
                        style={{
                          background: snapshot.isDraggingOver ? '#1a2035' : undefined,
                          borderRadius: '0 0 6px 6px',
                          transition: 'background 0.15s',
                        }}
                      >
                        {cards.map((job, index) => (
                          <Draggable key={job.id} draggableId={job.id} index={index} isDragDisabled={isGraveyard}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                              >
                                <PipelineCard
                                  job={job}
                                  dragHandleProps={provided.dragHandleProps}
                                  onEdit={(j) => setEditJob(j)}
                                  onWon={handleWon}
                                  onLost={handleLost}
                                  onNoValue={handleNoValue}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      <JobFormModal
        open={newLeadOpen}
        defaultStatus="new_lead"
        onClose={() => {
          setNewLeadOpen(false);
          queryClient.invalidateQueries({ queryKey: ['pipeline-jobs'] });
        }}
      />
      <JobFormModal
        open={!!editJob}
        selectedJob={editJob}
        onClose={() => {
          setEditJob(null);
          queryClient.invalidateQueries({ queryKey: ['pipeline-jobs'] });
        }}
      />
    </>
  );
}

export default PipelineBoard;

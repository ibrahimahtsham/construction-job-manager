import React from 'react';
import { Modal, Collapse } from 'antd';
import { FAQ_SECTIONS } from '../../data/faqContent.js';

const { Panel } = Collapse;

const helpStyles = `
  .help-modal .ant-modal-content { background: #1e2436; border: 1px solid #2e3550; border-radius: 8px; padding: 0; }
  .help-modal .ant-modal-header { background: #141826; border-bottom: 1px solid #2e3550; border-radius: 8px 8px 0 0; padding: 14px 20px; margin: 0; }
  .help-modal .ant-modal-title { font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #d4870a; }
  .help-modal .ant-modal-close { color: #4a5060; top: 10px; inset-inline-end: 14px; }
  .help-modal .ant-modal-close:hover { color: #9aa0b4; background: transparent; }
  .help-modal .ant-modal-body { padding: 16px 20px 20px; max-height: 70vh; overflow-y: auto; }
  .help-modal .ant-collapse { background: transparent; border: none; }
  .help-modal .ant-collapse-item { border-bottom: 1px solid #2e3550 !important; border: none; }
  .help-modal .ant-collapse-item:last-child { border-bottom: none !important; }
  .help-modal .ant-collapse-header { padding: 12px 0 !important; color: #f0ede8 !important; }
  .help-modal .ant-collapse-header:hover { color: #d4870a !important; }
  .help-modal .ant-collapse-header-text { font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .help-modal .ant-collapse-expand-icon { color: #4a5060 !important; }
  .help-modal .ant-collapse-content { background: transparent !important; border-top: none !important; }
  .help-modal .ant-collapse-content-box { padding: 0 0 14px 0 !important; }
  .help-faq-body { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #c8c4be; line-height: 1.7; white-space: pre-wrap; padding-left: 4px; border-left: 2px solid #2e3550; }
`;

function HelpModal({ open, onClose }) {
  return (
    <>
      <style>{helpStyles}</style>
      <Modal
        className="help-modal"
        open={open}
        onCancel={onClose}
        footer={null}
        width={720}
        title="Help & Documentation"
        destroyOnHidden
      >
        <Collapse ghost accordion={false}>
          {FAQ_SECTIONS.map((section) => (
            <Panel header={section.title} key={section.key}>
              <div className="help-faq-body">{section.content}</div>
            </Panel>
          ))}
        </Collapse>
      </Modal>
    </>
  );
}

export default HelpModal;

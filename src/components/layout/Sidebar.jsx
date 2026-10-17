import React from 'react';
import { Menu } from 'antd';
import { BarsOutlined, DatabaseOutlined, SettingOutlined, DashboardOutlined, ContactsOutlined, FileTextOutlined, FunnelPlotOutlined, CheckSquareOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';

const sidebarStyles = `
  .summit-sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #0f1320;
    overflow: hidden;
  }

  .summit-logo-area {
    padding: 24px 20px 0 20px;
    flex-shrink: 0;
  }

  .summit-logo-text {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #d4870a;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
  }

  .summit-logo-collapsed {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: #d4870a;
    text-align: center;
    letter-spacing: 0.1em;
  }

  .summit-logo-bar {
    width: 60px;
    height: 2px;
    background: #d4870a;
    margin-top: 8px;
    margin-bottom: 20px;
  }

  .summit-logo-dot {
    width: 8px;
    height: 8px;
    background: #d4870a;
    border-radius: 50%;
    margin: 8px auto 16px auto;
  }

  .summit-menu-wrapper {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .summit-menu-wrapper .ant-menu {
    background: #0f1320 !important;
    border-inline-end: none !important;
  }

  .summit-menu-wrapper .ant-menu-item {
    border-radius: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    padding-left: 20px !important;
  }

  .summit-menu-wrapper .ant-menu-item-selected {
    background: #1e2436 !important;
    border-left: 3px solid #d4870a !important;
    padding-left: 17px !important;
  }

  .summit-menu-wrapper .ant-menu-item:hover:not(.ant-menu-item-selected) {
    background: #161c2e !important;
  }

  .summit-menu-wrapper .ant-menu-item .ant-menu-title-content {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .summit-sidebar-footer {
    padding: 16px 20px;
    border-top: 1px solid #2e3550;
    flex-shrink: 0;
  }

  .summit-sidebar-footer-text {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: #4a5060;
    letter-spacing: 0.05em;
    text-align: center;
  }
`;

function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const selectedKey = location.pathname.startsWith('/admin/settings')
    ? 'settings'
    : location.pathname.startsWith('/catalog')
    ? 'catalog'
    : location.pathname.startsWith('/documents')
    ? 'documents'
    : location.pathname.startsWith('/customers')
    ? 'customers'
    : location.pathname.startsWith('/dashboard')
    ? 'dashboard'
    : location.pathname === '/jobs/pipeline'
    ? 'pipeline'
    : location.pathname === '/jobs/completed'
    ? 'completed'
    : location.pathname.startsWith('/jobs')
    ? 'active'
    : 'active';

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: collapsed ? null : 'Dashboard',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: 'pipeline',
      icon: <FunnelPlotOutlined />,
      label: collapsed ? null : 'Pipeline',
      onClick: () => navigate('/jobs/pipeline'),
    },
    {
      key: 'active',
      icon: <BarsOutlined />,
      label: collapsed ? null : 'Active Jobs',
      onClick: () => navigate('/jobs/active'),
    },
    {
      key: 'completed',
      icon: <CheckSquareOutlined />,
      label: collapsed ? null : 'Completed',
      onClick: () => navigate('/jobs/completed'),
    },
    {
      key: 'customers',
      icon: <ContactsOutlined />,
      label: collapsed ? null : 'Customers',
      onClick: () => navigate('/customers'),
    },
    {
      key: 'catalog',
      icon: <DatabaseOutlined />,
      label: collapsed ? null : 'Catalog',
      onClick: () => navigate('/catalog'),
    },
    {
      key: 'documents',
      icon: <FileTextOutlined />,
      label: collapsed ? null : 'Documents',
      onClick: () => navigate('/documents'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: collapsed ? null : 'Settings',
      onClick: () => navigate('/admin/settings'),
    },
  ];

  return (
    <>
      <style>{sidebarStyles}</style>
      <div className="summit-sidebar">
        <div className="summit-logo-area">
          {collapsed ? (
            <>
              <div className="summit-logo-collapsed">M</div>
              <div className="summit-logo-dot" />
            </>
          ) : (
            <>
              <div className="summit-logo-text">SUMMIT</div>
              <div className="summit-logo-bar" />
            </>
          )}
        </div>

        <div className="summit-menu-wrapper">
          <Menu
            mode="inline"
            theme="dark"
            selectedKeys={[selectedKey]}
            inlineCollapsed={collapsed}
            items={menuItems}
            style={{ background: '#0f1320', borderRight: 'none' }}
          />
        </div>

        {!collapsed && (
          <div className="summit-sidebar-footer">
            <div className="summit-sidebar-footer-text">SUMMIT v1.0</div>
          </div>
        )}
      </div>
    </>
  );
}

export default Sidebar;

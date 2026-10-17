import React, { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';

const { Sider, Content } = Layout;

function AppShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh', background: '#141826' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        collapsedWidth={64}
        style={{
          background: '#0f1320',
          borderRight: '1px solid #2e3550',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 200,
          overflow: 'hidden',
        }}
        trigger={
          <div
            style={{
              background: '#0f1320',
              borderTop: '1px solid #2e3550',
              color: '#4a5060',
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {collapsed ? '»' : '«'}
          </div>
        }
      >
        <Sidebar collapsed={collapsed} />
      </Sider>

      <Layout
        style={{
          marginLeft: collapsed ? 64 : 220,
          transition: 'margin-left 0.2s',
          background: '#141826',
          minHeight: '100vh',
        }}
      >
        <TopBar />
        <Content
          style={{
            padding: '24px',
            background: '#141826',
            minHeight: 'calc(100vh - 56px)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default AppShell;

import { theme } from 'antd';

export default {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#d4870a',
    colorBgContainer: '#1e2436',
    colorBgLayout: '#141826',
    colorBgElevated: '#252c42',
    colorText: '#f0ede8',
    colorTextSecondary: '#9aa0b4',
    colorBorder: '#2e3550',
    colorBorderSecondary: '#252c42',
    borderRadius: 4,
    fontFamily: "'Barlow', sans-serif",
    fontSize: 14,
    colorSuccess: '#52c41a',
    colorError: '#ff4d4f',
    colorWarning: '#faad14',
    colorInfo: '#1677ff',
  },
  components: {
    Table: {
      colorBgContainer: '#1e2436',
      headerBg: '#141826',
      rowHoverBg: '#252c42',
      borderColor: '#2e3550',
    },
    Menu: {
      darkItemBg: '#0f1320',
      darkSubMenuItemBg: '#0a0e1a',
      darkItemSelectedBg: '#1e2436',
      darkItemSelectedColor: '#d4870a',
    },
    Modal: { contentBg: '#1e2436', headerBg: '#1e2436' },
    Card: { colorBgContainer: '#1e2436' },
    Input: { colorBgContainer: '#141826' },
    Select: { colorBgContainer: '#141826' },
    Button: { defaultBg: '#252c42', defaultBorderColor: '#2e3550', defaultColor: '#f0ede8' },
  },
};

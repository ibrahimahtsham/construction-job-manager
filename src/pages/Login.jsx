import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const loginStyles = `
  .summit-login-page {
    min-height: 100vh;
    background-color: #141826;
    background-image: radial-gradient(circle, #2e3550 1px, transparent 1px);
    background-size: 28px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .summit-login-card {
    width: 420px;
    background: #1e2436;
    border: 1px solid #2e3550;
    border-radius: 6px;
    padding: 48px 40px;
    margin-top: calc(50vh - 180px);
  }

  .summit-login-logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 32px;
    font-weight: 700;
    letter-spacing: 0.2em;
    color: #d4870a;
    text-align: center;
    line-height: 1;
    margin-bottom: 10px;
  }

  .summit-login-amber-bar {
    width: 60px;
    height: 2px;
    background: #d4870a;
    margin: 0 auto 10px auto;
  }

  .summit-login-subtitle {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.15em;
    color: #9aa0b4;
    text-align: center;
    text-transform: uppercase;
    margin-bottom: 36px;
  }

  .summit-login-error {
    background: rgba(255, 77, 79, 0.08);
    border: 1px solid rgba(255, 77, 79, 0.3);
    border-radius: 4px;
    color: #ff7875;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    padding: 10px 14px;
    margin-bottom: 20px;
    text-align: center;
  }

  .summit-ms-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    height: 44px;
    background: #2a5bd7;
    border: none;
    border-radius: 4px;
    color: #fff;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.2s, transform 0.15s;
  }

  .summit-ms-btn:hover {
    background: #3468e8;
    transform: translateY(-1px);
  }

  .summit-ms-btn:active {
    transform: translateY(0);
  }

  .summit-login-footer {
    margin-top: 24px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #4a5060;
    text-align: center;
    letter-spacing: 0.05em;
  }
`;

const MS_ICON = (
  <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
    <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
  </svg>
);

const ERROR_MESSAGES = {
  invalid_state: 'Login session expired. Please try again.',
  unauthorized_tenant: 'Your account is not authorized for this app.',
  auth_failed: 'Authentication failed. Please try again.',
  no_email: 'Could not retrieve your email from Microsoft.',
  access_denied: 'Access was denied. Please contact your administrator.',
};

function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorKey = searchParams.get('error');
  const errorMsg = errorKey ? (ERROR_MESSAGES[errorKey] || 'An error occurred. Please try again.') : null;

  return (
    <>
      <style>{loginStyles}</style>
      <div className="summit-login-page">
        <div className="summit-login-card">
          <div className="summit-login-logo">SUMMIT</div>
          <div className="summit-login-amber-bar" />
          <div className="summit-login-subtitle">Job Management System</div>

          {errorMsg && <div className="summit-login-error">{errorMsg}</div>}

          {/* Demo build: the real app signs in with Microsoft SSO */}
          <a
            href="#"
            className="summit-ms-btn"
            onClick={(e) => {
              e.preventDefault();
              sessionStorage.removeItem('demo-logged-out');
              navigate('/dashboard');
            }}
          >
            {MS_ICON}
            Sign in with Microsoft (demo)
          </a>
        </div>
        <div className="summit-login-footer">SUMMIT v1.0</div>
      </div>
    </>
  );
}

export default Login;

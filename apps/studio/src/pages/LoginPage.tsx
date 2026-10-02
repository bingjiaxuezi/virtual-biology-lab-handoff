import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { useAuth } from '../auth/auth';

/** 登录 / 注册：单表单双模式，错误码友好化。 */
export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(username, password);
      else await register(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError('用户名或密码错误');
      else if (err instanceof ApiError && err.status === 409) setError('用户名已被占用');
      else setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>教师端</h1>
        <div className="segmented">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            注册
          </button>
        </div>
        <label className="field">
          <span>用户名</span>
          <input
            value={username}
            minLength={3}
            maxLength={32}
            required
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="field">
          <span>密码（至少 8 位）</span>
          <input
            type="password"
            value={password}
            minLength={8}
            maxLength={72}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="panel-hint error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? '请稍候…' : mode === 'login' ? '登录' : '注册并登录'}
        </button>
      </form>
    </div>
  );
}

export function LoginScreen({
  loginName,
  setLoginName,
  loginPassword,
  setLoginPassword,
  loginError,
  login,
}: {
  loginName: string;
  setLoginName: (value: string) => void;
  loginPassword: string;
  setLoginPassword: (value: string) => void;
  loginError: string;
  login: () => void;
}) {
  return (
    <div className="login-wrap">
      <section className="panel login-panel">
        <div className="login-logo-wrap">
          <img src="/rca-logo.png" alt="Referee College of Australia logo" className="login-logo" />
        </div>

        <p className="eyebrow">Login</p>
        <h1>Referee Development Platform</h1>

        <div className="form-stack" style={{ marginTop: 18 }}>
          <label>
            Email
            <input
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="Email address"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
            />
          </label>

          <button className="primary" onClick={login}>Login</button>

          {loginError && <p className="danger-text">{loginError}</p>}

          <p className="hint">
            Sign in using your RefEval email and password.
          </p>
        </div>
      </section>
    </div>
  );
}
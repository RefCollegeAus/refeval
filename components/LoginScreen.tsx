type Role = "super_admin" | "admin" | "educator" | "referee";

export function LoginScreen({
  loginRole,
  setLoginRole,
  loginName,
  setLoginName,
  loginPassword,
  setLoginPassword,
  loginError,
  login,
}: {
  loginRole: Role;
  setLoginRole: (role: Role) => void;
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

        <div className="mode-switch" style={{ marginTop: 18 }}>
          <button className={loginRole === "super_admin" ? "primary" : ""} onClick={() => setLoginRole("super_admin")}>Super Admin</button>
          <button className={loginRole === "admin" ? "primary" : ""} onClick={() => setLoginRole("admin")}>Org Admin</button>
          <button className={loginRole === "educator" ? "primary" : ""} onClick={() => setLoginRole("educator")}>Educator</button>
          <button className={loginRole === "referee" ? "primary" : ""} onClick={() => setLoginRole("referee")}>Referee</button>
        </div>

        <div className="form-stack" style={{ marginTop: 18 }}>
          <label>
            Name
            <input
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder={
                loginRole === "super_admin"
                  ? "Logan Bilby"
                  : loginRole === "admin"
                  ? "Demo Admin"
                  : loginRole === "educator"
                  ? "Demo Educator"
                  : "Demo Referee"
              }
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder={loginRole === "referee" ? "demo" : loginRole === "educator" ? "educator" : "admin"}
            />
          </label>

          <button className="primary" onClick={login}>Login</button>

          {loginError && <p className="danger-text">{loginError}</p>}

          <p className="hint">
            Defaults: Super Admin Logan Bilby / admin · Org Admin Demo Admin / admin · Educator Demo Educator / educator · Referee Demo Referee / demo.
          </p>
        </div>
      </section>
    </div>
  );
}
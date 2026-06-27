import { useState } from "react";
import { useAuth } from "../context/AuthContext";

/** 더미 로그인 화면 (프로토타입 — 실제 인증 없음) */
export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("choigilhan@4thparty.co.kr");
  const [pw, setPw] = useState("demo");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) login(email.trim());
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">
          <span className="gb-logo" style={{ width: 40, height: 40, fontSize: 22 }}>F</span>
        </div>
        <h1 className="login-title">Flow Production Tracking</h1>
        <p className="login-sub">프로토타입 · 더미 로그인</p>

        <label className="login-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <label className="login-field">
          <span>Password</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>

        <button type="submit" className="login-btn">Sign In</button>
        <p className="login-note">아무 이메일이나 입력 후 Sign In (검증 없음)</p>
      </form>
    </div>
  );
}

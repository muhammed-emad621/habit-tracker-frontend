import { useState } from "react";
import { api } from "../api/client";
import Input from "../components/Input";
import Button from "../components/Button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext"; // ✅ change this

export default function LoginPage() {
  const nav = useNavigate();
  const { setToken } = useAuth(); // ✅ now comes from AuthContext

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });

      setToken(res.data.token); // ✅ IMPORTANT: triggers re-render
      nav("/"); // ✅ redirect works instantly, no refresh

    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-slate-600 mt-1">Login to continue</p>

        <div className="mt-5 space-y-3">
          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && <p className="text-red-600 text-sm">{err}</p>}

          <Button onClick={onLogin} disabled={loading || !email || !password}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          No account?{" "}
          <Link className="font-semibold text-slate-900" to="/register">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

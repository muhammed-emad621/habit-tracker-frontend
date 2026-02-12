import { useState } from "react";
import { api } from "../api/client";
import Input from "../components/Input";
import Button from "../components/Button";
import { Link, useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    setErr(null);
    setLoading(true);
    try {
      await api.post("/auth/register", { name, email, password });
      nav("/login");
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Register failed");
      console.log(e?.response?.data || e);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="text-slate-600 mt-1">Start tracking gently</p>

        <div className="mt-5 space-y-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

          {err && <p className="text-red-600 text-sm">{err}</p>}

          <Button onClick={onRegister} disabled={loading || !name || !email || !password}>
            {loading ? "Creating..." : "Register"}
          </Button>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Have an account? <Link className="font-semibold text-slate-900" to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/useAuth";

type SharedHabit = {
  owner: string;
  name: string;
  lastFailureDate: string | null;
  streak: number;
  history: string[];
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const formatDuration = (ms: number) => {
  if (ms < 0) ms = 0;

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return `${days}d ${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`;
};

const streakTime = (lastFailureDate: string | null) => {
  if (!lastFailureDate) return "0d 00:00:00";
  return formatDuration(Date.now() - new Date(lastFailureDate).getTime());
};

export default function SharedPage() {
  const { logout } = useAuth();
  const [habits, setHabits] = useState<SharedHabit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/habits/shared")
      .then(res => setHabits(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Shared with me 💙</h1>
          <button onClick={logout} className="text-sm font-semibold underline">
            Logout
          </button>
        </div>

        {loading && <p className="mt-6 text-slate-600">Loading…</p>}

        <div className="mt-6 space-y-4">
          {habits.map((h, i) => (
            <div key={i} className="rounded-3xl bg-white p-6 shadow">
              <p className="text-sm text-slate-500">
                Shared by <span className="font-semibold">{h.owner}</span>
              </p>

              <p className="mt-1 text-xl font-bold">{h.name}</p>

              <p className="mt-2 text-slate-600">
                Current streak:{" "}
                <span className="font-semibold text-slate-900">
                  {streakTime(h.lastFailureDate)}
                </span>
              </p>

              <p className="mt-3 text-sm text-slate-500">
                You’re here to support, not judge 💙
              </p>
            </div>
          ))}

          {!loading && habits.length === 0 && (
            <p className="text-slate-600">
              No habits shared with you yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

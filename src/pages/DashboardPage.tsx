import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import Button from "../components/Button";
import Input from "../components/Input";
import { useAuth } from "../auth/AuthContext";


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

const streakTime = (lastFailureDate: string | null, startDate?: string | null) => {
  const base = lastFailureDate ?? startDate ?? null;
  if (!base) return "0d 00:00:00";
  const ms = Date.now() - new Date(base).getTime();
  return formatDuration(ms);
};

type Habit = {
  _id: string;
  name: string;
  shareCode: string;
  startDate?: string | null;
  lastFailureDate: string | null;

  almostRelapsesCount?: number;
  almostRelapses?: { date: string; note?: string }[];

  sharedWithNames?: string[]; // ✅ show names here
};

type SharedHabit = {
  owner: string;
  name: string;
  startDate?: string | null;
  lastFailureDate: string | null;
  almostRelapsesCount: number;
};

export default function DashboardPage() {
  const { logout } = useAuth();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [sharedHabits, setSharedHabits] = useState<SharedHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [newHabitName, setNewHabitName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // 3-dot menu
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  // live ticker for streak time
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const [mineRes, sharedRes] = await Promise.all([
        api.get("/habits/mine"),
        api.get("/habits/shared"),
      ]);

      setHabits(mineRes.data.habits);
      setSharedHabits(sharedRes.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addHabit = async () => {
    if (!newHabitName.trim()) return;
    try {
      await api.post("/habits/add", { name: newHabitName.trim() });
      setNewHabitName("");
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Failed to add habit");
    }
  };

  const relapse = async (habitId: string) => {
    try {
      await api.post("/habits/fail", { habitId });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Failed to log relapse");
    }
  };

  const urge = async (habitId: string) => {
    try {
      await api.post("/habits/urge", { habitId, note: "" });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Failed to log almost relapse");
    }
  };

  const joinShared = async () => {
    if (!joinCode.trim()) return;
    try {
      await api.post("/habits/share", { code: joinCode.trim() });
      setJoinCode("");
      await load();
      alert("Joined successfully 💙");
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      if (msg === "Already shared") {
        setJoinCode("");
        await load();
        alert("You’re already supporting this habit 💙");
        return;
      }
      alert(msg ?? "Failed to join");
    }
  };

  const deleteHabit = async (habitId: string) => {
    const ok = confirm("Delete this habit? This cannot be undone.");
    if (!ok) return;

    try {
      await api.delete(`/habits/${habitId}`);
      setOpenMenuFor(null);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Failed to delete habit");
    }
  };

  const myHabitsEmpty = useMemo(() => !loading && habits.length === 0, [loading, habits.length]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button onClick={logout} className="text-sm font-semibold underline">
            Logout
          </button>
        </div>

        {/* Add habit */}
        <div className="mt-6 rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">Add a habit</h2>
          <div className="mt-3 flex gap-2">
            <Input
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="e.g. hair pulling"
            />
            <button onClick={addHabit} className="rounded-xl bg-slate-900 px-4 font-semibold text-white">
              Add
            </button>
          </div>
        </div>

        {/* Join by code */}
        <div className="mt-4 rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">Join someone’s habit (code)</h2>
          <div className="mt-3 flex gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. 5TM0G1"
            />
            <button onClick={joinShared} className="rounded-xl bg-slate-900 px-4 font-semibold text-white">
              Join
            </button>
          </div>
        </div>

        {/* My habits */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold">My habits</h2>

          {loading && <p className="mt-3 text-slate-600">Loading...</p>}
          {err && <p className="mt-3 text-red-600">{err}</p>}

          <div className="mt-3 space-y-3">
            {habits.map((h) => (
              <div key={h._id} className="rounded-3xl bg-white p-6 shadow relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xl font-bold break-words">{h.name}</p>

                    {/* partner visibility */}
                    {(!h.sharedWithNames || h.sharedWithNames.length === 0) ? (
                      <p className="mt-1 text-sm text-slate-400">Not shared yet</p>
                    ) : (
                      <p className="mt-1 text-sm text-emerald-700 font-semibold">
                        💙 Shared with:{" "}
                        <span className="font-semibold">
                          {h.sharedWithNames.join(", ")}
                        </span>
                      </p>
                    )}

                    <p className="mt-2 text-slate-600">
                      Streak:{" "}
                      <span className="font-semibold text-slate-900">
                        {streakTime(h.lastFailureDate, h.startDate)}
                      </span>
                    </p>

                    <p className="text-slate-600">
                      Almost relapses:{" "}
                      <span className="font-semibold text-slate-900">
                        {h.almostRelapsesCount ?? (h.almostRelapses?.length ?? 0)}
                      </span>
                    </p>

                    {(h.almostRelapses?.length ?? 0) > 0 && (
                      <div className="mt-3 text-sm text-slate-600">
                        <p className="font-semibold text-slate-700">Last almost relapses:</p>
                        <ul className="mt-1 list-disc pl-5">
                          {h.almostRelapses!
                            .slice(-3)
                            .reverse()
                            .map((u, idx) => (
                              <li key={idx}>
                                {new Date(u.date).toLocaleString()}
                                {u.note ? ` — ${u.note}` : ""}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="text-right text-sm shrink-0">
                    <p className="text-slate-500">Share code</p>
                    <p className="font-mono font-bold">{h.shareCode}</p>

                    {/* 3-dot menu */}
                    <div className="relative mt-2">
                      <button
                        onClick={() => setOpenMenuFor(openMenuFor === h._id ? null : h._id)}
                        className="rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-100"
                        aria-label="Menu"
                        title="Menu"
                      >
                        ⋮
                      </button>

                      {openMenuFor === h._id && (
                        <div className="absolute right-0 mt-2 w-40 rounded-xl border bg-white shadow-lg overflow-hidden z-10">
                          <button
                            onClick={() => deleteHabit(h._id)}
                            className="w-full text-left px-4 py-2 text-red-600 font-semibold hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button className="bg-red-600 hover:bg-red-500" onClick={() => relapse(h._id)}>
                    I relapsed 😔
                  </Button>
                  <Button className="bg-amber-600 hover:bg-amber-500" onClick={() => urge(h._id)}>
                    Almost relapsed ⚠️
                  </Button>
                </div>
              </div>
            ))}

            {myHabitsEmpty && (
              <p className="text-slate-600">No habits yet. Add one above.</p>
            )}
          </div>
        </div>

        {/* Shared with me */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Shared with me 💙</h2>

          <div className="mt-3 space-y-3">
            {sharedHabits.map((h, i) => (
              <div key={i} className="rounded-3xl bg-white p-6 shadow">
                <p className="text-sm text-slate-500">
                  Shared by <span className="font-semibold">{h.owner}</span>
                </p>

                <p className="mt-1 text-xl font-bold">{h.name}</p>

                <p className="mt-2 text-slate-600">
                  Current streak:{" "}
                  <span className="font-semibold text-slate-900">
                    {streakTime(h.lastFailureDate, h.startDate)}
                  </span>
                </p>

                <p className="mt-1 text-slate-600">
                  Almost relapses:{" "}
                  <span className="font-semibold text-slate-900">
                    {h.almostRelapsesCount ?? 0}
                  </span>
                </p>

                <p className="mt-3 text-sm text-slate-500">
                  You’re here to support, not judge 💙
                </p>
              </div>
            ))}

            {!loading && sharedHabits.length === 0 && (
              <p className="text-slate-600">
                Nothing shared with you yet. Paste a code above.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Button from "../components/Button";
import Input from "../components/Input";
import Notification from "../components/Notification";
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
  id: string;
  name: string;
  shareCode: string;
  startDate?: string | null;
  lastFailureDate: string | null;

  almostRelapsesCount?: number;
  almostRelapses?: { date: string; note?: string }[];

  sharedWithNames?: string[];
  sharedWith?: string[];
  sharedWithUsers?: { id: string; name: string }[];
};

type SharedHabit = {
  id?: string;
  habitId?: string;
  _id?: string;
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
  const [profile, setProfile] = useState<{ id: string; name: string; email: string; createdAt: string } | null>(null);

  // 3-dot menu
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  // Sharing management
  const [managingSharingFor, setManagingSharingFor] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: "success" | "error" | "info"; onConfirm?: () => void; onCancel?: () => void; confirmText?: string; cancelText?: string }[]>([]);
  let notificationId = 0;

  const showNotification = useCallback((message: string, type: "success" | "error" | "info" = "info", onConfirm?: () => void, onCancel?: () => void, confirmText?: string, cancelText?: string) => {
    const id = ++notificationId;
    setNotifications(prev => [...prev, { id, message, type, onConfirm, onCancel, confirmText, cancelText }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Loading states for actions
  const [addingHabit, setAddingHabit] = useState(false);
  const [joiningHabit, setJoiningHabit] = useState(false);
  const [removingViewer, setRemovingViewer] = useState<string | null>(null);

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
      const [mineRes, sharedRes, profileRes] = await Promise.all([
        api.get("/habits/mine"),
        api.get("/habits/shared"),
        api.get("/auth/profile"),
      ]);

      setHabits(mineRes.data.habits);
      setSharedHabits(sharedRes.data.habits || sharedRes.data);
      setProfile(profileRes.data);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        setErr("Not authorized");
      } else {
        setErr(e?.response?.data?.message ?? "Failed to load data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addHabit = async () => {
    if (!newHabitName.trim() || addingHabit) return;
    setAddingHabit(true);
    try {
      await api.post("/habits/add", { name: newHabitName.trim() });
      setNewHabitName("");
      await load();
      showNotification("Habit added successfully!", "success");
    } catch (e: any) {
      showNotification(e?.response?.data?.message ?? "Failed to add habit", "error");
    } finally {
      setAddingHabit(false);
    }
  };

  const relapse = async (habitId: string) => {
    try {
      await api.post("/habits/fail", { habitId });
      await load();
      showNotification("Relapse logged", "info");
    } catch (e: any) {
      showNotification(e?.response?.data?.message ?? "Failed to log relapse", "error");
    }
  };

  const urge = async (habitId: string) => {
    try {
      await api.post("/habits/urge", { habitId, note: "" });
      await load();
      showNotification("Almost relapse logged", "info");
    } catch (e: any) {
      showNotification(e?.response?.data?.message ?? "Failed to log almost relapse", "error");
    }
  };

  const joinShared = async () => {
    if (!joinCode.trim() || joiningHabit) return;
    setJoiningHabit(true);
    try {
      await api.post("/habits/share", { code: joinCode.trim() });
      setJoinCode("");
      await load();
      showNotification("Joined successfully 💙", "success");
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      if (msg === "Already shared") {
        setJoinCode("");
        await load();
        showNotification("You’re already supporting this habit 💙", "info");
        return;
      }
      showNotification(msg ?? "Failed to join", "error");
    } finally {
      setJoiningHabit(false);
    }
  };

const deleteHabit = async (habitId: string | undefined) => {
  if (!habitId) {
    showNotification("Something went wrong. Missing habit ID.", "error");
    return;
  }

  const performDelete = async () => {
    try {
      await api.delete(`/habits/${habitId}`);
      setOpenMenuFor(null);
      await load();
      showNotification("Habit deleted successfully", "success");
    } catch (e: any) {
      showNotification(e?.response?.data?.message ?? "Failed to delete habit", "error");
    }
  };

  showNotification("Delete this habit? This cannot be undone.", "error", performDelete, undefined, "Delete", "Cancel");
};

const leaveSharedHabit = async (habit: SharedHabit) => {
  const habitId = habit.id || habit.habitId || habit._id;

  if (!habitId) {
    showNotification("Something went wrong. Missing habit ID.", "error");
    return;
  }

  const performLeave = async () => {
    try {
      await api.delete(`/habits/shared/${habitId}`);
      await load();
      showNotification("Left shared habit successfully", "success");
    } catch (e: any) {
      showNotification(e?.response?.data?.message ?? "Failed to leave shared habit", "error");
    }
  };

  showNotification("Leave this shared habit? You won't see it anymore.", "error", performLeave, undefined, "Leave", "Cancel");
};

  const getSharedViewers = (habit: Habit) =>
    habit.sharedWithUsers ??
    (habit.sharedWith ?? []).map((id, i) => ({
      id,
      name: habit.sharedWithNames?.[i] ?? "Unknown",
    }));

  const removeViewer = async (habitId: string, userId: string, userName: string) => {
    const key = `${habitId}-${userId}`;
    if (removingViewer === key) return;

    const performRemove = async () => {
      setRemovingViewer(key);
      try {
        await api.delete(`/habits/${habitId}/shared/${userId}`);
        await load();
        showNotification(`${userName} can no longer view this habit`, "success");
      } catch (e: any) {
        showNotification(e?.response?.data?.message ?? "Failed to remove viewer", "error");
      } finally {
        setRemovingViewer(null);
      }
    };

    showNotification(
      `Remove ${userName}? They won't be able to view this habit anymore.`,
      "error",
      performRemove,
      undefined,
      "Remove",
      "Cancel"
    );
  };

  const myHabitsEmpty = useMemo(() => !loading && habits.length === 0, [loading, habits.length]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-950 dark:hover:bg-slate-300"
            >
              {profile?.name
                ? profile.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "ME"}
            </Link>
            <button onClick={logout} className="text-sm font-semibold underline">
              Logout
            </button>
          </div>
        </div>

        {/* Add habit */}
        <div className="mt-6 rounded-3xl bg-white p-6 shadow dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Add a habit</h2>
          <div className="mt-3 flex gap-2">
            <Input
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="e.g. hair pulling"
            />
            <button
              onClick={addHabit}
              disabled={addingHabit}
              className="rounded-xl bg-slate-900 px-4 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingHabit ? "Adding..." : "Add"}
            </button>
          </div>
        </div>

        {/* Join by code */}
        <div className="mt-4 rounded-3xl bg-white p-6 shadow dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Join someone’s habit (code)</h2>
          <div className="mt-3 flex gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. 5TM0G1"
            />
            <button
              onClick={joinShared}
              disabled={joiningHabit}
              className="rounded-xl bg-slate-900 px-4 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joiningHabit ? "Joining..." : "Join"}
            </button>
          </div>
        </div>

        {/* My habits */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold">My habits</h2>

          {loading && <p className="mt-3 text-slate-600 dark:text-slate-300">Loading...</p>}
          {err && <p className="mt-3 text-red-600">{err}</p>}

          <div className="mt-3 space-y-3">
            {habits.map((h) => (
              <div key={h.id} className="rounded-3xl bg-white p-6 shadow relative dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xl font-bold break-words">{h.name}</p>

                    {/* partner visibility */}
                    {getSharedViewers(h).length === 0 ? (
                      <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Not shared yet</p>
                    ) : (
                      <div className="mt-1">
                        <p className="text-sm text-emerald-700 font-semibold dark:text-emerald-400">
                          💙 Shared with:{" "}
                          <span className="font-semibold">
                            {getSharedViewers(h).map((v) => v.name).join(", ")}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setManagingSharingFor(managingSharingFor === h.id ? null : h.id)
                          }
                          className="mt-1 text-xs font-semibold text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          {managingSharingFor === h.id ? "Hide viewers" : "Manage viewers"}
                        </button>
                      </div>
                    )}

                    {managingSharingFor === h.id && getSharedViewers(h).length > 0 && (
                      <ul className="mt-2 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                        {getSharedViewers(h).map((viewer) => {
                          const key = `${h.id}-${viewer.id}`;
                          return (
                            <li
                              key={viewer.id}
                              className="flex items-center justify-between gap-2 text-sm"
                            >
                              <span className="font-medium text-slate-700 dark:text-slate-200">
                                {viewer.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeViewer(h.id, viewer.id, viewer.name)}
                                disabled={removingViewer === key}
                                className="rounded-lg bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
                              >
                                {removingViewer === key ? "Removing..." : "Remove"}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <p className="mt-2 text-slate-600 dark:text-slate-300">
                      Streak:{" "}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {streakTime(h.lastFailureDate, h.startDate)}
                      </span>
                    </p>

                    <p className="text-slate-600 dark:text-slate-300">
                      Almost relapses:{" "}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {h.almostRelapsesCount ?? (h.almostRelapses?.length ?? 0)}
                      </span>
                    </p>

                    {(h.almostRelapses?.length ?? 0) > 0 && (
                      <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">Last almost relapses:</p>
                        <ul className="mt-1 list-disc pl-5">
                          {h.almostRelapses!
                            .slice(-3)
                            .reverse()
                            .map((u, idx) => (
                              <li key={idx}>
                                {(() => {
                                  if (!u.date) return "—";
                                  const d = new Date(u.date);
                                  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
                                })()}
                                {u.note ? ` — ${u.note}` : ""}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="text-right text-sm shrink-0">
                    <p className="text-slate-500 dark:text-slate-400">Share code</p>
                    <p className="font-mono font-bold dark:text-slate-100">{h.shareCode}</p>

                    {/* 3-dot menu */}
                    <div className="relative mt-2">
                      <button
                        onClick={() => setOpenMenuFor(openMenuFor === h.id ? null : h.id)}
                        className="rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        aria-label="Menu"
                        title="Menu"
                      >
                        ⋮
                      </button>

                      {openMenuFor === h.id && (
                        <div className="absolute right-0 mt-2 w-40 rounded-xl border bg-white shadow-lg overflow-hidden z-10 dark:bg-slate-900 dark:border-slate-700">
                          <button
                            onClick={() => deleteHabit(h.id)}
                            className="w-full text-left px-4 py-2 text-red-600 font-semibold hover:bg-red-50 dark:hover:bg-slate-800"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button className="bg-red-600 hover:bg-red-500" onClick={() => relapse(h.id)}>
                    I relapsed 😔
                  </Button>
                  <Button className="bg-amber-600 hover:bg-amber-500" onClick={() => urge(h.id)}>
                    Almost relapsed ⚠️
                  </Button>
                </div>
              </div>
            ))}

            {myHabitsEmpty && (
              <p className="text-slate-600 dark:text-slate-300">No habits yet. Add one above.</p>
            )}
          </div>
        </div>

        {/* Shared with me */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Shared with me 💙</h2>

          <div className="mt-3 space-y-3">
            {sharedHabits.map((h, i) => (
              <div key={i} className="rounded-3xl bg-white p-6 shadow dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Shared by <span className="font-semibold dark:text-slate-100">{h.owner}</span>
                    </p>

                    <p className="mt-1 text-xl font-bold dark:text-slate-100">{h.name}</p>

                    <p className="mt-2 text-slate-600 dark:text-slate-300">
                      Current streak:{" "}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {streakTime(h.lastFailureDate, h.startDate)}
                      </span>
                    </p>

                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      Almost relapses:{" "}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {h.almostRelapsesCount ?? 0}
                      </span>
                    </p>

                    <p className="mt-3 text-sm text-slate-500">
                      You’re here to support, not judge 💙
                    </p>
                  </div>

                  {/* 3-dot menu */}
                  <div className="relative ml-4">
                    <button
                      onClick={() => {
                        const habitId = h.id || h.habitId || h._id || null;
                        setOpenMenuFor(openMenuFor === habitId ? null : habitId);
                      }}
                      className="rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      aria-label="Menu"
                      title="Menu"
                    >
                      ⋮
                    </button>

                    {(() => {
                      const habitId = h.id || h.habitId || h._id || null;
                      return openMenuFor === habitId && (
                        <div className="absolute right-0 mt-2 w-32 rounded-xl border bg-white shadow-lg overflow-hidden z-10 dark:bg-slate-900 dark:border-slate-700">
                          <button
                            onClick={() => leaveSharedHabit(h)}
                            className="w-full text-left px-4 py-2 text-red-600 font-semibold hover:bg-red-50 dark:hover:bg-slate-800"
                          >
                            Leave
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
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

      {/* Regular notifications */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 flex flex-col items-center">
        {notifications.filter(n => !n.onConfirm).slice().reverse().map((n) => (
          <Notification
            key={n.id}
            message={n.message}
            type={n.type}
            onClose={() => removeNotification(n.id)}
          />
        ))}
      </div>

      {/* Modal notifications */}
      {notifications.filter(n => n.onConfirm).map((n) => {
        const handleConfirm = () => {
          removeNotification(n.id);
          n.onConfirm?.();
        };

        const handleCancel = () => {
          n.onCancel?.();
          removeNotification(n.id);
        };

        return (
          <Notification
            key={n.id}
            message={n.message}
            type={n.type}
            onClose={() => removeNotification(n.id)}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            confirmText={n.confirmText}
            cancelText={n.cancelText}
          />
        );
      })}
    </div>
  );
}

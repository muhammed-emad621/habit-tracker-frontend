import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/useAuth";
import Notification from "../components/Notification";

type SharedHabit = {
  id: string;
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

const streakTime = (lastFailureDate: string | null, startDate?: string | null) => {
  const base = lastFailureDate ?? startDate ?? null;

  if (!base) return "0d 00:00:00";

  const date = new Date(base);

  // Handle invalid date
  if (isNaN(date.getTime())) {
    return "0d 00:00:00";
  }

  const now = Date.now();
  const diff = now - date.getTime();

  // Prevent negative differences or timezone issues
  if (diff < 0) return "0d 00:00:00";

  return formatDuration(diff);
};

export default function SharedPage() {
  const { logout } = useAuth();
  const [habits, setHabits] = useState<SharedHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ id: string; name: string; email: string; createdAt: string } | null>(null);

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

  const leaveSharedHabit = async (habitId: string) => {
    const performLeave = async () => {
      try {
        await api.delete(`/habits/shared/${habitId}`);
        setHabits(prev => prev.filter(h => h.id !== habitId));
        showNotification("Left shared habit successfully", "success");
      } catch (e: any) {
        showNotification(e?.response?.data?.message ?? "Failed to leave shared habit", "error");
      }
    };

    showNotification("Leave this shared habit? You won't see it anymore.", "error", performLeave, undefined, "Leave", "Cancel");
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [habitsRes, profileRes] = await Promise.all([
          api.get("/habits/shared"),
          api.get("/auth/profile"),
        ]);
        setHabits(habitsRes.data);
        setProfile(profileRes.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Shared with me 💙</h1>
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

        {loading && <p className="mt-6 text-slate-600">Loading…</p>}

        <div className="mt-6 space-y-4">
          {habits.map((h, i) => (
            <div key={i} className="rounded-3xl bg-white p-6 shadow dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Shared by <span className="font-semibold dark:text-slate-100">{h.owner}</span>
                  </p>

                  <p className="mt-1 text-xl font-bold dark:text-slate-100">{h.name}</p>

                  <p className="mt-2 text-slate-600 dark:text-slate-300">
                    Current streak:{" "}
                    <span className="font-semibold text-slate-900">
                      {streakTime(h.lastFailureDate)}
                    </span>
                  </p>

                  <p className="mt-3 text-sm text-slate-500">
                    You’re here to support, not judge 💙
                  </p>
                </div>

                <button
                  onClick={() => leaveSharedHabit(h.id)}
                  className="ml-4 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                >
                  Leave
                </button>
              </div>
            </div>
          ))}

          {!loading && habits.length === 0 && (
            <p className="text-slate-600 dark:text-slate-300">
              No habits shared with you yet.
            </p>
          )}
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

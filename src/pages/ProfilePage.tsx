import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/Button";
import Notification from "../components/Notification";

export default function ProfilePage() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<{ id: string; name: string; email: string; createdAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get("/auth/profile");
        setProfile(res.data);
      } catch (e: any) {
        setErr(e?.response?.data?.message ?? "Unable to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const deleteAccount = async () => {
    const performDelete = async () => {
      setErr(null);
      try {
        await api.delete("/auth/delete");
        logout();
      } catch (e: any) {
        setErr(e?.response?.data?.message ?? "Failed to delete account");
      }
    };

    showNotification("Are you sure you want to delete your account? This cannot be undone.", "error", performDelete, undefined, "Delete", "Cancel");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profile</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">Your account details</p>
          </div>
          <button onClick={() => nav(-1)} className="text-sm font-semibold underline">
            Back
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-slate-600 dark:text-slate-300">Loading profile…</p>
        ) : (
          <div className="mt-6 rounded-3xl bg-white p-6 shadow dark:bg-slate-900">
            {profile ? (
              <div className="space-y-4 text-slate-900 dark:text-slate-100">
                <div>
                  <p className="text-sm uppercase text-slate-500 dark:text-slate-400">Name</p>
                  <p className="text-lg font-semibold">{profile.name}</p>
                </div>
                <div>
                  <p className="text-sm uppercase text-slate-500 dark:text-slate-400">Email</p>
                  <p>{profile.email}</p>
                </div>
                <div>
                  <p className="text-sm uppercase text-slate-500 dark:text-slate-400">Joined</p>
                  <p>{new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-300">No profile available.</p>
            )}

            {err && <p className="mt-4 text-red-600">{err}</p>}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button onClick={() => nav(-1)} className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-950 dark:hover:bg-slate-300">
                Back to dashboard
              </Button>
              <button
                onClick={deleteAccount}
                className="rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500"
              >
                Delete account
              </button>
            </div>
          </div>
        )}
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

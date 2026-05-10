import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar/Navbar";
import { authService } from "../../services/auth.service";
import type { User } from "../../services/auth.service";
import styles from "./Profile.module.css";
import titleStyles from "../../components/CSS Components/titles.module.css";
import { Eye, EyeOff, Lock } from "lucide-react";

function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showPwForm, setShowPwForm] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinPassword, setPinPassword] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);

  useEffect(() => {
    authService
      .getProfile()
      .then((res) => setUser(res.data.user))
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ??
          "Could not load profile. Please refresh the page.";
        setProfileError(msg);
      });
  }, []);

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "";

  const formatDate = (iso: string) => {
    const y = iso.slice(0, 4);
    const m = iso.slice(5, 7);
    const d = iso.slice(8, 10);
    return `${d}-${m}-${y}`;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (newPassword !== confirmNewPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }

    setPwLoading(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      setPwSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowPwForm(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update password.";
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  };

  const handleCancelPw = () => {
    setShowPwForm(false);
    setPwError("");
    setPwSuccess("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const handleRevealPin = () => {
    if (revealedPin) {
      setRevealedPin(null);
      return;
    }
    setPinPassword("");
    setPinError("");
    setShowPinPrompt(true);
  };

  const handlePinPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPinLoading(true);
    setPinError("");
    try {
      await authService.login({ email: user.email, password: pinPassword });
      setRevealedPin(user.pin ?? "—");
      setShowPinPrompt(false);
      setPinPassword("");
    } catch {
      setPinError("Incorrect password.");
    } finally {
      setPinLoading(false);
    }
  };

  const handleCancelPinPrompt = () => {
    setShowPinPrompt(false);
    setPinPassword("");
    setPinError("");
  };

  return (
    <div className={styles.pageContainer}>
      <Navbar />
      <h1 className={titleStyles.pageTitle1}>Profile</h1>

      <div className={styles.card}>
        {profileError && <p className={styles.error}>{profileError}</p>}
        {/* Avatar + name + role */}
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>{initials}</div>
          <p className={styles.fullName}>{user?.fullName ?? ""}</p>
          <span className={styles.badge}>{user?.role ?? ""}</span>
        </div>

        <hr className={styles.divider} />

        {/* Info rows */}
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Status</span>
            <span className={styles.rowValue}>{user?.status ?? "—"}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Registered</span>
            <span className={styles.rowValue}>
              {user ? formatDate(user.createdAt) : "—"}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Employee Code</span>
            <span className={styles.rowValue}>{user?.employeeCode ?? "—"}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>PIN</span>
            <span className={styles.pinRowRight}>
              <span className={styles.rowValue}>{revealedPin ?? "••••"}</span>
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={handleRevealPin}
                aria-label={revealedPin ? "Hide PIN" : "Show PIN"}
              >
                {revealedPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Password</span>
            <span className={styles.rowValue}>••••••••</span>
          </div>
        </div>

        <button
          type="button"
          className={`${styles.changePwRow} ${showPwForm ? styles.changePwRowOpen : ""}`}
          onClick={() => setShowPwForm((v) => !v)}
        >
          <span>{showPwForm ? "Cancel" : "Change password"}</span>
          <span className={styles.changePwArrow}>{showPwForm ? "✕" : "→"}</span>
        </button>

        {/* Inline change-password form */}
        {showPwForm && (
          <form className={styles.pwForm} onSubmit={handleChangePassword}>
            <div className={styles.pwFields}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="currentPassword">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  className={styles.input}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="newPassword">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  className={styles.input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="confirmNewPassword">
                  Confirm New Password
                </label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  className={styles.input}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {pwError && <p className={styles.error}>{pwError}</p>}
            {pwSuccess && <p className={styles.success}>{pwSuccess}</p>}

            <div className={styles.pwActions}>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={pwLoading}
              >
                {pwLoading ? "Updating..." : "Update Password"}
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleCancelPw}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {pwSuccess && !showPwForm && (
          <p className={styles.success}>{pwSuccess}</p>
        )}
      </div>

      {showPinPrompt && (
        <div className={styles.pinModalOverlay} onClick={handleCancelPinPrompt}>
          <div className={styles.pinModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.pinModalIcon}>
              <Lock size={22} />
            </div>
            <div className={styles.pinModalHeader}>
              <p className={styles.pinModalTitle}>Verify your identity</p>
              <p className={styles.pinModalSubtitle}>
                Enter your account password to reveal your PIN
              </p>
            </div>
            <form
              className={styles.pinModalForm}
              onSubmit={handlePinPasswordSubmit}
            >
              <div className={styles.pinInputWrap}>
                <label className={styles.label} htmlFor="pinConfirmPassword">
                  Password
                </label>
                <input
                  id="pinConfirmPassword"
                  type="password"
                  className={styles.input}
                  placeholder="••••••••"
                  value={pinPassword}
                  onChange={(e) => setPinPassword(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              {pinError && <p className={styles.error}>{pinError}</p>}
              <div className={styles.pinModalActions}>
                <button
                  type="submit"
                  className={styles.pinConfirmBtn}
                  disabled={pinLoading}
                >
                  {pinLoading ? "Verifying..." : "Reveal PIN"}
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleCancelPinPrompt}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;

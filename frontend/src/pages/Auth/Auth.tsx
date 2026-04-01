import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar.tsx";
import { authService } from "../../services/auth.service.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import type { RegisterData, LoginData } from "../../services/auth.service.ts";
import styles from "./Auth.module.css";

function Auth() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  // Login form state
  const [loginData, setLoginData] = useState<LoginData>({
    email: "",
    password: "",
  });

  // Register form state
  const [registerData, setRegisterData] = useState<RegisterData>({
    email: "",
    fullname: "",
    password: "",
    confirmPassword: "",
  });

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await authService.login(loginData);
      setAuth(response.data.user, response.data.token);
      console.log("Admin Token:", response.data.token);
      setSuccess(response.message);
      setTimeout(() => navigate("/"), 1000);
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await authService.register(registerData);
      setSuccess(response.message);
      setAuth(response.data.user, response.data.token);
      setRegisterData({
        email: "",
        fullname: "",
        password: "",
        confirmPassword: "",
      });
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors
          .map((e: any) => e.message)
          .join(", ");
        setError(errorMessages);
      } else {
        const message =
          err.response?.data?.message ||
          err.message ||
          "Registration failed. Please try again.";
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await authService.login({
        email: import.meta.env.VITE_ADMIN_EMAIL,
        password: import.meta.env.VITE_ADMIN_PASSWORD,
      });
      setAuth(response.data.user, response.data.token);
      console.log("Admin Token:", response.data.token);
      setSuccess("Logged in as Admin (Dev Only)");
      setTimeout(() => navigate("/"), 1000);
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || "Dev login failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.home}>
      <Navbar />
      <div className={styles.brand}>
        <img
          src="/src/assets/icons/fulfillmentplus_icon_b2.png"
          alt="Fulfillment Plus Logo"
          className={styles.brandLogo}
        />
        <h1 className={styles.title}>
          Fulfillment <span className={styles.plus}>Plus</span>
        </h1>
        <h4 className={styles.subtitle}>Time Logging Software</h4>
      </div>

      <div className={styles.authContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "login" ? styles.activeTab : ""}`}
            onClick={() => {
              setActiveTab("login");
              setError("");
              setSuccess("");
            }}
          >
            Login
          </button>
          <button
            className={`${styles.tab} ${activeTab === "register" ? styles.activeTab : ""}`}
            onClick={() => {
              setActiveTab("register");
              setError("");
              setSuccess("");
            }}
          >
            Register
          </button>
        </div>

        <div className={styles.formContainer}>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {activeTab === "login" ? (
            <form className={styles.form} onSubmit={handleLoginSubmit}>
              {/* Dev login button - remove before production */}
              <button
                type="button"
                onClick={handleDevLogin}
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? "Logging in..." : "Dev Admin Login"}
              </button>

              <label htmlFor="login-email">Email</label>
              <input
                type="email"
                id="login-email"
                name="email"
                placeholder="Enter your email"
                className={styles.input}
                value={loginData.email}
                onChange={(e) =>
                  setLoginData({ ...loginData, email: e.target.value })
                }
                required
                disabled={loading}
              />

              <label htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                name="password"
                placeholder="Enter your password"
                className={styles.input}
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
                required
                disabled={loading}
              />

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={handleRegisterSubmit}>
              <label htmlFor="register-email">Email</label>
              <input
                type="email"
                id="register-email"
                name="email"
                placeholder="Enter your email"
                className={styles.input}
                value={registerData.email}
                onChange={(e) =>
                  setRegisterData({ ...registerData, email: e.target.value })
                }
                required
                disabled={loading}
              />

              <label htmlFor="register-fullname">Full Name</label>
              <input
                type="text"
                id="register-fullname"
                name="fullname"
                placeholder="Enter your full name"
                className={styles.input}
                value={registerData.fullname}
                onChange={(e) =>
                  setRegisterData({ ...registerData, fullname: e.target.value })
                }
                required
                disabled={loading}
              />

              <label htmlFor="register-password">Password</label>
              <input
                type="password"
                id="register-password"
                name="password"
                placeholder="Enter your password"
                className={styles.input}
                value={registerData.password}
                onChange={(e) =>
                  setRegisterData({ ...registerData, password: e.target.value })
                }
                required
                disabled={loading}
              />

              <label htmlFor="register-confirm">Confirm Password</label>
              <input
                type="password"
                id="register-confirm"
                name="confirmPassword"
                placeholder="Confirm password"
                className={styles.input}
                value={registerData.confirmPassword}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    confirmPassword: e.target.value,
                  })
                }
                required
                disabled={loading}
              />

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? "Registering..." : "Register"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;

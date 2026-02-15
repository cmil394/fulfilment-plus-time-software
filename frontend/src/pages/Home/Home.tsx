import { useState } from "react";
import Navbar from "../../components/Navbar/Navbar.tsx";
import styles from "./Home.module.css";

function Home() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  return (
    <div className={styles.home}>
      <Navbar />
      <div className={styles.brand}>
        <img
          src="/src/assets/icons/fulfillmentplus_icon_b.png"
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
            onClick={() => setActiveTab("login")}
          >
            Login
          </button>
          <button
            className={`${styles.tab} ${activeTab === "register" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("register")}
          >
            Register
          </button>
        </div>

        <div className={styles.formContainer}>
          {activeTab === "login" ? (
            <form className={styles.form}>
              <label htmlFor="login-email">Email</label>
              <input
                type="email"
                id="login-email"
                name="email"
                className={styles.input}
              />

              <label htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                name="password"
                className={styles.input}
              />

              <button type="submit" className={styles.submitButton}>
                Login
              </button>
            </form>
          ) : (
            <form className={styles.form}>
              <label htmlFor="register-email">Email</label>
              <input
                type="email"
                id="register-email"
                name="email"
                className={styles.input}
              />
              <label htmlFor="register-fullname">Full Name</label>
              <input
                type="text"
                id="register-fullname"
                name="fullname"
                className={styles.input}
              />

              <label htmlFor="register-password">Password</label>
              <input
                type="password"
                id="register-password"
                name="password"
                className={styles.input}
              />

              <label htmlFor="register-confirm">Confirm Password</label>
              <input
                type="password"
                id="register-confirm"
                name="confirmPassword"
                className={styles.input}
              />

              <button type="submit" className={styles.submitButton}>
                Register
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;

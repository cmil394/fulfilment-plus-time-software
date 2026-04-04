import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import styles from "./Navbar.module.css";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout, user } = useAuth();
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isAdmin = user?.role === "Admin" || user?.role === "Owner";
  const isInAdminSection = isAdmin && location.pathname.startsWith("/admin");

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarBrand}>
        <img
          src="/src/assets/icons/fulfillmentplus_icon_w.png"
          alt="Fulfillment Plus Logo"
          className={styles.logoIcon}
        />
        <span className={styles.brandText}>Fulfillment Plus</span>
      </div>

      <button
        className={styles.hamburger}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <ul className={`${styles.navbarLinks} ${isMenuOpen ? styles.open : ""}`}>
        {isAdmin && !isInAdminSection && (
          <li>
            <a
              href="/admin/employees"
              className={`${styles.navLink} ${isInAdminSection ? styles.active : ""}`}
            >
              Admin
            </a>
          </li>
        )}
        <li>
          <a
            href="/dashboard"
            className={`${styles.navLink} ${location.pathname === "/dashboard" ? styles.active : ""}`}
          >
            Dashboard
          </a>
        </li>

        {isInAdminSection ? (
          <>
            <li>
              <a
                href="/admin/employees"
                className={`${styles.navLink} ${location.pathname === "/admin/employees" ? styles.active : ""}`}
              >
                Employees
              </a>
            </li>
            <li>
              <a
                href="/admin/customers"
                className={`${styles.navLink} ${location.pathname === "/admin/customers" ? styles.active : ""}`}
              >
                Manage Customers
              </a>
            </li>
            <li className={styles.noRightBorder}>
              <a
                href="/admin/tasks"
                className={`${styles.navLink} ${location.pathname === "/admin/tasks" ? styles.active : ""}`}
              >
                Manage Tasks
              </a>
            </li>
          </>
        ) : (
          <>
            <li>
              <a href="/customers" className={styles.navLink}>
                Customers
              </a>
            </li>
            <li>
              <a href="/reports" className={styles.navLink}>
                Reports
              </a>
            </li>
            <li className={styles.noRightBorder}>
              <a href="/profile" className={styles.navLink}>
                Profile
              </a>
            </li>
          </>
        )}

        {user && (
          <li className={styles.logoutItem}>
            <button className={styles.logOutBtn} onClick={logout}>
              Log Out
            </button>
          </li>
        )}
      </ul>

      {user && (
        <button className={styles.logOutBtnDesktop} onClick={logout}>
          Log Out
        </button>
      )}
    </nav>
  );
}

export default Navbar;

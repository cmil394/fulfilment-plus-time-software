import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import styles from "./Navbar.module.css";
import logoWhite from "../../assets/icons/fulfillmentplus_icon_w.png";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout, user } = useAuth();
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isAdmin = user?.role === "Admin" || user?.role === "Owner";
  const isInAdminSection = isAdmin && location.pathname.startsWith("/admin");
  const isKioskPage = location.pathname === "/kiosk";
  const isLoginPage = location.pathname === "/login";

  if (isKioskPage) {
    return (
      <nav className={styles.navbar}>
        <div className={styles.navbarBrand}>
          <img
            src={logoWhite}
            alt="Fulfillment Plus Logo"
            className={styles.logoIcon}
          />
          <span className={styles.brandText}>Fulfillment Plus</span>
        </div>

        <ul className={styles.navbarLinks}>
          <li>
            <Link to="/login" className={styles.navLink}>
              Log In
            </Link>
          </li>
        </ul>
      </nav>
    );
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarBrand}>
        <img
          src={logoWhite}
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
            <Link
              to="/admin/employees"
              className={`${styles.navLink} ${
                isInAdminSection ? styles.active : ""
              }`}
            >
              Admin
            </Link>
          </li>
        )}
        <li>
          <Link
            to="/dashboard"
            className={`${styles.navLink} ${
              location.pathname === "/dashboard" ? styles.active : ""
            }`}
          >
            Dashboard
          </Link>
        </li>

        {isInAdminSection ? (
          <>
            <li>
              <Link
                to="/admin/employees"
                className={`${styles.navLink} ${
                  location.pathname === "/admin/employees" ? styles.active : ""
                }`}
              >
                Employees
              </Link>
            </li>
            <li>
              <Link
                to="/admin/customers"
                className={`${styles.navLink} ${
                  location.pathname === "/admin/customers" ? styles.active : ""
                }`}
              >
                Manage Customers
              </Link>
            </li>
            <li className={styles.noRightBorder}>
              <Link
                to="/admin/tasks"
                className={`${styles.navLink} ${
                  location.pathname === "/admin/tasks" ? styles.active : ""
                }`}
              >
                Manage Tasks
              </Link>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link
                to="/customers"
                className={`${styles.navLink} ${location.pathname === "/customers" ? styles.active : ""}`}
              >
                Customers
              </Link>
            </li>
            <li>
              <Link
                to="/reports"
                className={`${styles.navLink} ${location.pathname === "/reports" ? styles.active : ""}`}
              >
                Reports
              </Link>
            </li>
            <li className={user ? styles.noRightBorder : ""}>
              <Link
                to="/profile"
                className={`${styles.navLink} ${location.pathname === "/profile" ? styles.active : ""}`}
              >
                Profile
              </Link>
            </li>
          </>
        )}

        {/* Kiosk */}
        {!user && isLoginPage && (
          <li className={styles.noRightBorder}>
            <Link
              to="/kiosk"
              className={`${styles.navLink} ${styles.noRightBorder}`}
            >
              Kiosk
            </Link>
          </li>
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

import { useState } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import styles from "./Navbar.module.css";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout, user } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

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
        <li>
          <a href="/overview" className={`${styles.navLink} ${styles.active}`}>
            Overview
          </a>
        </li>
        <li>
          <a href="/projects" className={styles.navLink}>
            Projects
          </a>
        </li>
        <li>
          <a href="/reports" className={styles.navLink}>
            Reports
          </a>
        </li>
        <li>
          <a href="/profile" className={styles.navLink}>
            Profile
          </a>
        </li>
      </ul>

      {user && (
        <button className={styles.logOutBtn} onClick={logout}>
          Log Out
        </button>
      )}
    </nav>
  );
}

export default Navbar;

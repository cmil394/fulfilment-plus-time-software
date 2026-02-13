import styles from "./Navbar.module.css";

function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarBrand}>
        <span className={styles.brandText}>Fulfillment Plus</span>
      </div>

      <ul className={styles.navbarLinks}>
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

      <button className={styles.signOutBtn}>Sign Out</button>
    </nav>
  );
}

export default Navbar;

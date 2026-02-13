import Navbar from "../../components/Navbar/Navbar.tsx";
import styles from "./Home.module.css";

function Home() {
  return (
    <div className={styles.home}>
      <Navbar />
      <p>Welcome to the Fulfillment Plus Time Software!</p>
    </div>
  );
}

export default Home;

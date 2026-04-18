import { useEffect } from "react";
import Navbar from "../../components/Navbar/Navbar";
import { useAuth } from "../../context/AuthContext";

export default function Kiosk() {
  const { logout, user } = useAuth();

  useEffect(() => {
    if (user) {
      logout();
    }
  }, []);

  return (
    <div>
      <Navbar />
      <div>Kiosk</div>
    </div>
  );
}

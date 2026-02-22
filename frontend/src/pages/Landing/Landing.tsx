import { useAuth } from "../../context/AuthContext.tsx";

function Landing() {
  const { logout } = useAuth();
  return (
    <div>
      <button onClick={logout}>Log Out</button>
      <h1>Welcome to Fulfillment Plus Time Software</h1>
      <p>Please log in to access your dashboard and manage your tasks.</p>
    </div>
  );
}

export default Landing;

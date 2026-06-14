import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Auth from "./Auth/Auth";
import Dashboard from "./Dashboard/Dashboard";
import Customers from "./Customers/Customers";
import Employees from "./Admin/Employees/Employees";
import AdminCustomers from "./Admin/AdminCustomers/AdminCustomers";
import Tasks from "./Tasks/Tasks";
import AdminTasks from "./Admin/AdminTasks/AdminTasks";
import Kiosk from "./Kiosk/Kiosk";
import Profile from "./Profile/Profile";
import Timesheets from "./Timesheets/Timesheets";
import LoadingSpinner from "../components/LoadingSpinner/LoadingSpinner";

function Home() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <Routes>
      <Route path="/kiosk" element={<Kiosk />} />
      <Route
        path="/login"
        element={!user ? <Auth /> : <Navigate to="/dashboard" />}
      />
      <Route
        path="/customers"
        element={user ? <Customers /> : <Navigate to="/login" />}
      />
      <Route
        path="/dashboard"
        element={user ? <Dashboard /> : <Navigate to="/login" />}
      />
      <Route
        path="/admin/customers"
        element={
          user?.role === "Admin" || user?.role === "Owner" ? (
            <AdminCustomers />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/admin/tasks"
        element={
          user?.role === "Admin" || user?.role === "Owner" ? (
            <AdminTasks />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/admin/employees"
        element={
          user?.role === "Admin" || user?.role === "Owner" ? (
            <Employees />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/profile"
        element={user ? <Profile /> : <Navigate to="/login" />}
      />
      <Route
        path="/timesheets"
        element={user ? <Timesheets /> : <Navigate to="/login" />}
      />
      <Route
        path="/tasks/:customerId"
        element={user ? <Tasks /> : <Navigate to="/login" />}
      />
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} />}
      />
    </Routes>
  );
}

export default Home;

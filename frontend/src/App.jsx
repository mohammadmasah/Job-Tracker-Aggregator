import { BrowserRouter, Route, Routes } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";

import AdminDashboard from "./pages/admin/AdminDashboard";
import UserDashboard from "./pages/user/UserDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/register' element={<Register />} />
        <Route path='/login' element={<Login />} />

        <Route path="/dashboard" element={
          <UserDashboard />
        } />

        <Route path="/admin/dashboard" element={
          <AdminDashboard />
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
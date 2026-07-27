import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { useTheme } from "./hooks/useTheme";

import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/user/Dashboard";
import Offers from "./pages/user/Offers";
import Applications from "./pages/user/Applications";
import Contacts from "./pages/user/Contacts";
import SettingsLayout, {
    SettingsStatistiques,
    SettingsNotifications,
    SettingsApparence,
} from "./pages/user/Settings";

export default function App() {
    useTheme();
    return (
        <BrowserRouter>
            <Routes>
                <Route path='/register' element={<Register />} />
                <Route path='/login' element={<Login />} />

                <Route
                    element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/offers" element={<Offers />} />
                    <Route path="/applications" element={<Applications />} />
                    <Route path="/contacts" element={<Contacts />} />

                    <Route path="/settings" element={<SettingsLayout />}>
                        <Route path="statistiques" element={<SettingsStatistiques />} />
                        <Route path="notifications" element={<SettingsNotifications />} />
                        <Route path="apparence" element={<SettingsApparence />} />
                    </Route>
                </Route>

                <Route
                    element={
                        <ProtectedRoute requireAdmin>
                            <Layout />
                        </ProtectedRoute>
                    }
                >
                    {/* <Route path="/admin" element={}/> */}
                    {/* <Route path="/admin/users" element={<AdminUsers />} /> */}
                </Route>

            </Routes>
        </BrowserRouter >
    );
}
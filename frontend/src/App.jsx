import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { useTheme } from "./hooks/useTheme";

import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/user/Dashboard";
import Offers from "./pages/user/Offers";
import Applications from "./pages/user/Applications";
import Contacts from "./pages/user/Contacts";
import ResetPassword from './pages/ResetPassword';
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
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route element={<Layout />}>
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

                <Route path="*" element={<NotFound />} />

            </Routes>
        </BrowserRouter>
    );
}
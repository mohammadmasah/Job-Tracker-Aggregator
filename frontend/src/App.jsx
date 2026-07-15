import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { useTheme } from "./hooks/useTheme";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Contacts from "./pages/Contacts";
import SettingsLayout, {
    SettingsStatistiques,
    SettingsNotifications,
    SettingsApparence,
} from "./pages/Settings";

export default function App() {
    useTheme();
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/applications" element={<Applications />} />
                    <Route path="/contacts" element={<Contacts />} />
                    <Route path="/settings" element={<SettingsLayout />}>
                        <Route path="statistiques" element={<SettingsStatistiques />} />
                        <Route path="notifications" element={<SettingsNotifications />} />
                        <Route path="apparence" element={<SettingsApparence />} />
                    </Route>
                </Route>
                <Route path='/register' element={<Register />} />
                <Route path='/login' element={<Login />} />
            </Routes>
        </BrowserRouter>
    );
}
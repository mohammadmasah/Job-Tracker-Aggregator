import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { useTheme } from "./hooks/useTheme";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/user/Dashboard";
import Applications from "./pages/user/Applications";
import Contacts from "./pages/user/Contacts";
import SettingsLayout, {
    SettingsStatistiques,
    SettingsNotifications,
    SettingsApparence,
} from "./pages/user/Settings";
import Offers from "./pages/user/Offers";
import AllOffers from "./pages/user/AllOffers";
import OffersLayout from "./components/OffersLayout";
import OffersBySourceView from "./components/OffersBySourceView";

export default function App() {
    useTheme();
    return (
        <BrowserRouter>
            <Routes>
                <Route path='/register' element={<Register />} />
                <Route path='/login' element={<Login />} />

                <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />

                    <Route path="/offers" element={<OffersLayout />}>
                        <Route path="source" element={<OffersBySourceView />} />  
                        <Route index element={<AllOffers />} />      
                    </Route>

                    <Route path="/applications" element={<Applications />} />
                    <Route path="/contacts" element={<Contacts />} />

                    <Route path="/settings" element={<SettingsLayout />}>
                        <Route path="statistiques" element={<SettingsStatistiques />} />
                        <Route path="notifications" element={<SettingsNotifications />} />
                        <Route path="apparence" element={<SettingsApparence />} />
                    </Route>
                </Route>

            </Routes>
        </BrowserRouter>
    );
}
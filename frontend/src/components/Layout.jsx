import { Outlet } from "react-router-dom";
import Nav from "../components/Nav";
import ChatWidget from "./ChatWidget";

export default function Layout() {
    return (
        <div className="h-screen bg-bg flex overflow-hidden">
            <Nav />
            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-16 md:pt-0">
                <Outlet />
            </main>
            <ChatWidget />
        </div>
    );
}
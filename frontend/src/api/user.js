import axios from "axios"


// Register
export const register = (data) => {
    return axios.post("/api/user/register", data)
}

// Login 
export const login = (data) => {
    return axios.post("/api/user/login", data)
}
// Logout — le serveur supprime le cookie HttpOnly.
export const logout = () => axios.post("/api/user/logout", {}, { withCredentials: true });

import axios from "axios"

// Register
export const register = (data) => {
    return axios.post("/api/user/register", data)
}

// Login 
export const login = (data) => {
    return axios.post("/api/user/login", data)
}
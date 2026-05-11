import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function CATIProtectedRoute(){
    const token = localStorage.getItem('cati_token');
    const location = useLocation();

    if(!token){
        return(
            <Navigate
                to="/mini-cati/login"
                replace
                state={{from: location}}
            />
        )
    }

    return <Outlet />;
}
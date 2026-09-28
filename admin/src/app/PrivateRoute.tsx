import React from "react";
import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { PATH } from "./store";
import { getGoogleLoginCookies } from "../lib/cookies/handleCookie";
import type { IUserCookie } from "../types/User";

interface PrivateRouteProps {
  element: ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ element: Component }) => {
  const user: IUserCookie | null = getGoogleLoginCookies();
  const location = useLocation();

  if (!user) {
    return <Navigate to={PATH.LOGIN} state={{ from: location }} />;
  }

  return Component;
};

export default PrivateRoute;

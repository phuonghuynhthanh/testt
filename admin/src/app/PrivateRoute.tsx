import React from "react";
import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { PATH } from "./store";
import { getAuthSession } from "../lib/cookies/handleCookie";

interface PrivateRouteProps {
  element: ReactElement;
}

// Allow access only while a non-expired CMS session exists.
const PrivateRoute: React.FC<PrivateRouteProps> = ({ element: Component }) => {
  const session = getAuthSession();
  const location = useLocation();

  if (!session) {
    return <Navigate to={PATH.LOGIN} state={{ from: location }} />;
  }

  return Component;
};

export default PrivateRoute;

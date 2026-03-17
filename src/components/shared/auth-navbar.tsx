"use client";

import { RootState } from "@/redux/store";
import { useSelector } from "react-redux";

export const AuthNavbar = () => {
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  return <></>;
};

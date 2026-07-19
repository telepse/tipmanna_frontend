/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";
import Cookies from "js-cookie";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { createVisitorTipperAction } from "@/actions/visitors";
import { setCredentials } from "@/features/auth-slice";
import { getDeviceKey } from "@/lib/getAuthToken";
import { touchVisitorTimestamp } from "@/lib/visitor-session";

export default function CreateVisitorOnLoad() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (user && token) return;

    // ✅ Consistent cookie keys
    const cookieUser = Cookies.get("visitorUser");
    const cookieToken = Cookies.get("visitorToken");

    if (cookieUser && cookieToken) {
      try {
        const parsedUser = JSON.parse(cookieUser);
        dispatch(
          setCredentials({
            user: parsedUser,
            token: cookieToken,
            requiresVerification: false,
          })
        );
        touchVisitorTimestamp();
        return;
      } catch (err) {
        console.error(err);
        console.warn("⚠️ Invalid cookie data, clearing visitor cookies...");
        Cookies.remove("visitorUser");
        Cookies.remove("visitorToken");
      }
    }

    const localVisitor = localStorage.getItem("visitorUser");
    if (localVisitor) {
      try {
        const parsed = JSON.parse(localVisitor);
        dispatch(
          setCredentials({
            user: parsed,
            token: "",
            requiresVerification: false,
          })
        );

        Cookies.set("visitorUser", JSON.stringify(parsed), {
          expires: 7,
          sameSite: "strict",
        });
        Cookies.set("visitorToken", "", { expires: 7, sameSite: "strict" });

        console.log("✅ Loaded visitor tipper from localStorage");
        return;
      } catch (err) {
        console.warn("⚠️ Corrupt local visitor data, recreating...");
        localStorage.removeItem("visitorUser");
      }
    }

    const registerVisitor = async () => {
      const result = await createVisitorTipperAction(getDeviceKey());
      console.log(result);

      if (result.success) {
        const visitorToken = result.data?.token as string;
        const { id, fullName, email, username, role } = result.data
          ?.user as any;

        // ✅ Save consistently
        Cookies.set("visitorToken", visitorToken, {
          expires: 7,
          sameSite: "strict",
        });
        Cookies.set(
          "visitorUser",
          JSON.stringify({ id, fullName, email, username, role }),
          { expires: 7, sameSite: "strict" }
        );

        dispatch(
          setCredentials({
            user: { id, fullName, email, username, role },
            token: visitorToken,
            requiresVerification: false,
          })
        );
        touchVisitorTimestamp();
      } else {
        console.error("❌ Visitor creation failed:", result.message);
      }
    };

    registerVisitor();
  }, [dispatch, user, token]);

  return null;
}

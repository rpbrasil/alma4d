"use client";

import { useState } from "react";
import PhoneOtpForm from "./PhoneOtpForm";
import EmailPasswordForm from "./EmailPasswordForm";

export default function LoginTabs() {
  const [tab, setTab] = useState<"phone" | "email">("phone");

  return (
    <div className="w-full max-w-md rounded-xl border p-6">
      <div className="flex mb-6 gap-2">
        <button
          onClick={() => setTab("phone")}
          className={tab === "phone" ? "font-bold" : ""}
        >
          Telefone
        </button>
        <button
          onClick={() => setTab("email")}
          className={tab === "email" ? "font-bold" : ""}
        >
          Email
        </button>
      </div>

      {tab === "phone" ? <PhoneOtpForm /> : <EmailPasswordForm />}
    </div>
  );
}

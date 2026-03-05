"use client";

import { useState } from "react";
import StepPersonal from "./StepPersonal";
import StepCompany from "./StepCompany";
import StepMenu from "./StepMenu";

export type OnboardingData = {
  // Step 1
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  document: string;
  // Step 2
  restaurant_name: string;
  whatsapp: string;
  instagram: string;
};

export default function OnboardingClient({
  userId,
  restaurantId,
  userEmail,
}: {
  userId: string;
  restaurantId: string;
  userEmail: string;
}) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    first_name: "", last_name: "", phone: "",
    email: userEmail, document: "",
    restaurant_name: "", whatsapp: "", instagram: "",
  });

  function next(partial: Partial<OnboardingData>) {
    setData((d) => ({ ...d, ...partial }));
    setStep((s) => s + 1);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "-apple-system, sans-serif",
    }}>
      {/* Progress */}
      <div style={{ display: "flex", gap: 8, marginBottom: 40 }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{
            width: s === step ? 32 : 8, height: 8,
            borderRadius: 999,
            background: s <= step ? "#fff" : "rgba(255,255,255,0.15)",
            transition: "all 0.3s ease",
          }} />
        ))}
      </div>

      {/* Steps */}
      <div style={{ width: "100%", maxWidth: 480 }}>
        {step === 1 && (
          <StepPersonal
            initial={data}
            onNext={(v) => next(v)}
          />
        )}
        {step === 2 && (
          <StepCompany
            initial={data}
            onNext={(v) => next(v)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepMenu
            data={data}
            userId={userId}
            restaurantId={restaurantId}
          />
        )}
      </div>
    </div>
  );
}

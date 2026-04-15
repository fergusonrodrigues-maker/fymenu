"use client";

type Req = { label: string; met: boolean };

function getReqs(password: string): Req[] {
  return [
    { label: "Mínimo 8 caracteres", met: password.length >= 8 },
    { label: "Contém letras",        met: /[a-zA-ZÀ-ÿ]/.test(password) },
    { label: "Contém números",       met: /[0-9]/.test(password) },
  ];
}

export function passwordValid(password: string): boolean {
  return getReqs(password).every((r) => r.met);
}

export function translatePasswordError(message: string): string {
  const lower = message.toLowerCase();
  if (
    (lower.includes("character") && lower.includes("number")) ||
    lower.includes("should contain at least one")
  ) {
    return "A senha deve conter letras e números";
  }
  if (lower.includes("password") || lower.includes("senha")) {
    return "Senha não atende os requisitos de segurança";
  }
  return message;
}

export default function PasswordReqs({ password }: { password: string }) {
  if (!password) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
      {getReqs(password).map(({ label, met }) => (
        <div
          key={label}
          style={{
            fontSize: 12,
            color: met ? "#00ffae" : "rgba(239,68,68,0.8)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "color 0.2s",
          }}
        >
          {met ? "✓" : "✗"} {label}
        </div>
      ))}
    </div>
  );
}

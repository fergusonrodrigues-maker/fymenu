"use client";

import { useState } from "react";
import PasswordReqs, { passwordValid, translatePasswordError } from "@/components/PasswordReqs";

export default function UpdatePasswordForm({
  action,
  error: serverError,
}: {
  action: (formData: FormData) => Promise<void>;
  error?: string;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [clientError, setClientError] = useState("");

  const canSubmit = passwordValid(password) && password === confirm;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!passwordValid(password)) {
      e.preventDefault();
      setClientError("A senha não atende todos os requisitos.");
      return;
    }
    if (password !== confirm) {
      e.preventDefault();
      setClientError("As senhas não correspondem.");
      return;
    }
    setClientError("");
  }

  const displayError = clientError || (serverError ? translatePasswordError(serverError) : "");

  return (
    <form action={action} onSubmit={handleSubmit}>
      {displayError && <div className="error-msg">⚠️ {displayError}</div>}
      <div className="input-group">
        <label className="input-label" htmlFor="password">Nova senha</label>
        <input
          id="password"
          className="input-field"
          type="password"
          name="password"
          placeholder="Mínimo 8 caracteres"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordReqs password={password} />
      </div>
      <div className="input-group">
        <label className="input-label" htmlFor="confirmPassword">Confirmar senha</label>
        <input
          id="confirmPassword"
          className="input-field"
          type="password"
          name="confirmPassword"
          placeholder="Repita a senha"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <button type="submit" className="submit-btn" disabled={!canSubmit}>
        Atualizar senha
      </button>
    </form>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite, declineInvite } from "./actions";
import type { InviteDetails } from "./actions";

const LOGO = "https://rjfbavmupiypxiqzksxo.supabase.co/storage/v1/object/public/landing/fymenu-vermelha.png";

export default function AceitarConviteClient({
  token,
  invite,
  userEmail,
}: {
  token: string;
  invite: InviteDetails;
  userEmail: string | null;
}) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptedRestaurant, setAcceptedRestaurant] = useState("");
  const [declined, setDeclined] = useState(false);
  const [actionError, setActionError] = useState("");

  const inviteUrl = `/aceitar-convite?token=${encodeURIComponent(token)}`;
  const loginUrl = `/entrar?redirect=${encodeURIComponent(inviteUrl)}`;
  const signupUrl = `/entrar?modo=criar&redirect=${encodeURIComponent(inviteUrl)}`;

  const emailMatch =
    invite.success &&
    userEmail?.toLowerCase() === invite.invitedEmail.toLowerCase();

  useEffect(() => {
    if (accepted) {
      const t = setTimeout(() => router.push("/painel"), 2500);
      return () => clearTimeout(t);
    }
  }, [accepted, router]);

  useEffect(() => {
    if (declined) {
      const t = setTimeout(() => router.push("/"), 2500);
      return () => clearTimeout(t);
    }
  }, [declined, router]);

  async function handleAccept() {
    setAccepting(true);
    setActionError("");
    const result = await acceptInvite(token);
    if (result.error) {
      setActionError(result.error);
      setAccepting(false);
      return;
    }
    setAcceptedRestaurant(result.restaurantName ?? "");
    setAccepted(true);
    setAccepting(false);
  }

  async function handleDecline() {
    setDeclining(true);
    await declineInvite(token);
    setDeclining(false);
    setDeclined(true);
  }

  const restaurantInitial = invite.success
    ? (invite.restaurantName?.[0] ?? "R").toUpperCase()
    : "?";

  return (
    <main style={{
      minHeight: "100vh",
      background: "#fafafa",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .auth-dots {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: radial-gradient(rgba(5,5,5,0.08) 1.2px, transparent 1.2px);
          background-size: 22px 22px; opacity: 0.5;
          mask-image: radial-gradient(ellipse at center, transparent 20%, black 70%);
          -webkit-mask-image: radial-gradient(ellipse at center, transparent 20%, black 70%);
        }
        .inv-card {
          position: relative; z-index: 2; width: 100%; max-width: 460px;
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 24px; padding: 36px 32px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08);
        }
        @media (max-width: 480px) {
          .inv-card { padding: 28px 20px; }
        }
        .inv-btn-primary {
          width: 100%; padding: 14px 32px; border: none; border-radius: 12px;
          background: #16a34a; color: #fff;
          font-size: 15px; font-weight: 800; font-family: inherit;
          cursor: pointer; transition: opacity 0.2s;
        }
        .inv-btn-primary:hover { opacity: 0.9; }
        .inv-btn-primary:disabled { opacity: 0.5; cursor: default; }
        .inv-btn-outline {
          width: 100%; padding: 14px 32px;
          border: 1.5px solid rgba(0,0,0,0.15); border-radius: 12px;
          background: transparent; color: #555;
          font-size: 15px; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: border-color 0.2s, color 0.2s;
        }
        .inv-btn-outline:hover { border-color: #888; color: #333; }
        .inv-btn-outline:disabled { opacity: 0.5; cursor: default; }
        .inv-btn-secondary {
          width: 100%; padding: 12px 24px; border: none; border-radius: 12px;
          background: #f0fdf4; color: #16a34a;
          font-size: 14px; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: background 0.2s; text-decoration: none;
          display: flex; align-items: center; justify-content: center;
        }
        .inv-btn-secondary:hover { background: #dcfce7; }
        .inv-btn-ghost {
          width: 100%; padding: 12px 24px; border: 1.5px solid rgba(0,0,0,0.12); border-radius: 12px;
          background: transparent; color: #666;
          font-size: 14px; font-weight: 600; font-family: inherit;
          cursor: pointer; text-decoration: none;
          display: flex; align-items: center; justify-content: center;
        }
        .inv-btn-ghost:hover { border-color: #aaa; }
      `}</style>

      <div className="auth-dots" />

      <div className="inv-card">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={LOGO} height={40} alt="FyMenu" style={{ objectFit: "contain" }} />
        </div>

        {/* ── ACCEPTED ── */}
        {accepted && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 48 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a" }}>Bem-vindo!</div>
            <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
              Você agora é sócio de <strong>{acceptedRestaurant}</strong>.<br />
              Redirecionando para o painel...
            </div>
            <div style={{ width: 32, height: 4, borderRadius: 2, background: "#16a34a", marginTop: 8,
              animation: "grow 2.5s linear forwards" }} />
            <style>{`@keyframes grow { from { width: 0 } to { width: 100% } }`}</style>
          </div>
        )}

        {/* ── DECLINED ── */}
        {declined && !accepted && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 48 }}>👋</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>Convite recusado</div>
            <div style={{ fontSize: 14, color: "#666" }}>Redirecionando...</div>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {!accepted && !declined && !invite.success && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(239,68,68,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28,
            }}>⚠️</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>
                {invite.error === "expired" ? "Convite expirado" :
                 invite.error === "already_accepted" ? "Já aceito" :
                 invite.error === "cancelled" ? "Convite cancelado" : "Convite inválido"}
              </div>
              <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
                {invite.message}
              </div>
            </div>
            <a href="/" style={{
              padding: "12px 32px", borderRadius: 12,
              background: "#f5f5f5", color: "#444",
              fontSize: 14, fontWeight: 700, textDecoration: "none",
              display: "inline-block",
            }}>Voltar ao FyMenu</a>
          </div>
        )}

        {/* ── VALID INVITE ── */}
        {!accepted && !declined && invite.success && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Restaurant avatar + name */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #ec4899, #f97316)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 28, fontWeight: 800,
              }}>{restaurantInitial}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", lineHeight: 1.2 }}>
                  {invite.restaurantName}
                </div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                  Convite de <strong style={{ color: "#555" }}>{invite.invitedByName}</strong>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(0,0,0,0.06)" }} />

            {/* State: not logged in */}
            {!userEmail && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  padding: "12px 16px", borderRadius: 12,
                  background: "rgba(22,163,74,0.06)",
                  border: "1px solid rgba(22,163,74,0.15)",
                  fontSize: 13, color: "#555", lineHeight: 1.6, textAlign: "center",
                }}>
                  Para aceitar, faça login com o email{" "}
                  <strong style={{ color: "#1a1a1a" }}>{invite.invitedEmail}</strong>
                </div>
                <a href={loginUrl} className="inv-btn-secondary">
                  Já tenho conta — Fazer login
                </a>
                <a href={signupUrl} className="inv-btn-ghost">
                  Criar conta com este email
                </a>
              </div>
            )}

            {/* State: logged in with wrong email */}
            {userEmail && !emailMatch && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  padding: "12px 16px", borderRadius: 12,
                  background: "rgba(239,68,68,0.05)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  fontSize: 13, color: "#555", lineHeight: 1.6,
                }}>
                  <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>Email diferente</div>
                  Este convite é para{" "}
                  <strong style={{ color: "#1a1a1a" }}>{invite.invitedEmail}</strong>, mas você está logado
                  como <strong style={{ color: "#1a1a1a" }}>{userEmail}</strong>.
                </div>
                <form action="/api/auth/signout" method="post">
                  <button type="submit" className="inv-btn-secondary" style={{ width: "100%" }}>
                    Trocar de conta
                  </button>
                </form>
              </div>
            )}

            {/* State: logged in with correct email */}
            {userEmail && emailMatch && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  fontSize: 14, color: "#555", textAlign: "center", lineHeight: 1.6,
                }}>
                  Você foi convidado para ser sócio deste restaurante.
                  Deseja aceitar?
                </div>

                {actionError && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 10,
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    fontSize: 13, color: "#dc2626",
                  }}>{actionError}</div>
                )}

                <button
                  className="inv-btn-primary"
                  onClick={handleAccept}
                  disabled={accepting || declining}
                >{accepting ? "Aceitando..." : "✓ Aceitar convite"}</button>
                <button
                  className="inv-btn-outline"
                  onClick={handleDecline}
                  disabled={accepting || declining}
                >{declining ? "Recusando..." : "Recusar"}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

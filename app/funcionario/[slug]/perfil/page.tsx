"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FyLoader from "@/components/FyLoader";

const supabase = createClient();

export default function PerfilFuncionarioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const empId = localStorage.getItem("fy_employee_id");
    if (!empId) { router.push("/funcionario/login"); return; }

    supabase.from("employees")
      .select("id, name, phone, cpf, role, team, current_status, shift_start, shift_end, work_days, salary")
      .eq("id", empId)
      .single()
      .then(({ data }) => {
        if (data) {
          setEmployee(data);
          setName(data.name || "");
          setPhone(data.phone || "");
        } else {
          router.push("/funcionario/login");
        }
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    if (!employee) return;
    setSaving(true);
    await supabase.from("employees").update({
      name: name.trim(),
      phone: phone.trim(),
    }).eq("id", employee.id);

    localStorage.setItem("fy_employee_name", name.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }

  async function handleChangePassword() {
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword.length < 4) { setPasswordError("Mínimo 4 caracteres"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Senhas não conferem"); return; }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/funcionario/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          currentPassword,
          newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPasswordError(json.error || "Erro ao alterar senha");
      } else {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch { setPasswordError("Erro de conexão"); }
    finally { setChangingPassword(false); }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <FyLoader size="md" />
    </div>
  );

  if (!employee) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", padding: 20 }}>
      <div style={{ maxWidth: 400, margin: "0 auto", paddingTop: 20 }}>
        {/* Header */}
        <button onClick={() => router.back()} style={{
          background: "transparent", border: "none", color: "rgba(255,255,255,0.4)",
          fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0,
        }}>← Voltar</button>

        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Meu Perfil</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>
          {employee.role} · {employee.team || "geral"}
        </div>

        {/* Info não editável */}
        <div style={{
          padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.03)",
          marginBottom: 20,
          boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
        }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>CPF</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
            {employee.cpf ? `***.***.${employee.cpf.slice(-5, -2)}-${employee.cpf.slice(-2)}` : "Não informado"}
          </div>
          {employee.shift_start && employee.shift_end && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Horário</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
                {employee.shift_start?.slice(0,5)} às {employee.shift_end?.slice(0,5)}
              </div>
            </div>
          )}
          {employee.work_days && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Dias de trabalho</div>
              <div style={{ display: "flex", gap: 4 }}>
                {(employee.work_days || []).map((d: string) => (
                  <span key={d} style={{
                    padding: "3px 8px", borderRadius: 6, fontSize: 10,
                    background: "rgba(0,255,174,0.08)", color: "#00ffae", textTransform: "capitalize",
                  }}>{d}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Editar nome e telefone */}
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Informações</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Nome</label>
          <input value={name} onChange={e => setName(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Telefone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(62) 99999-9999"
            style={{ width: "100%", padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
        </div>

        <button onClick={handleSave} disabled={saving} style={{
          width: "100%", padding: 14, borderRadius: 14, border: "none", cursor: "pointer",
          background: saved ? "rgba(0,255,174,0.15)" : "rgba(0,255,174,0.1)",
          color: "#00ffae", fontSize: 14, fontWeight: 800,
          boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
          opacity: saving ? 0.5 : 1, marginBottom: 32,
        }}>
          {saved ? "✅ Salvo!" : saving ? "Salvando..." : "Salvar"}
        </button>

        {/* Alterar senha */}
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Alterar senha</div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Senha atual</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Nova senha</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 4 caracteres"
            style={{ width: "100%", padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Confirmar nova senha</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "none", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
        </div>

        {passwordError && (
          <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(248,113,113,0.06)", color: "#f87171", fontSize: 12, marginBottom: 12 }}>{passwordError}</div>
        )}
        {passwordSuccess && (
          <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(0,255,174,0.06)", color: "#00ffae", fontSize: 12, marginBottom: 12 }}>✅ Senha alterada!</div>
        )}

        <button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword} style={{
          width: "100%", padding: 14, borderRadius: 14, border: "none", cursor: "pointer",
          background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 700,
          opacity: changingPassword || !currentPassword || !newPassword ? 0.4 : 1,
        }}>
          {changingPassword ? "Alterando..." : "Alterar senha"}
        </button>
      </div>
    </div>
  );
}

export function welcomeEmail(name: string, plan: string): { subject: string; html: string } {
  return {
    subject: "Bem-vindo ao FyMenu! 🎉",
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #050505; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #00ffae, #00d9ff); padding: 32px 24px; text-align: center;">
          <h1 style="color: #000; font-size: 28px; font-weight: 900; margin: 0;">FyMenu</h1>
          <p style="color: rgba(0,0,0,0.6); font-size: 14px; margin: 8px 0 0;">Cardápio Digital de Vídeo</p>
        </div>
        <div style="padding: 32px 24px; color: #fff;">
          <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 12px;">Olá, ${name}! 👋</h2>
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
            Sua conta foi criada com sucesso no plano <strong style="color: #00ffae;">${plan}</strong>.
          </p>
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
            Próximos passos:
          </p>
          <div style="margin: 0 0 24px;">
            <div style="margin-bottom: 12px;">
              <span style="background: rgba(0,255,174,0.1); color: #00ffae; padding: 4px 10px; border-radius: 50%; font-size: 12px; font-weight: 800; margin-right: 10px;">1</span>
              <span style="color: rgba(255,255,255,0.7); font-size: 13px;">Configure sua unidade (nome, logo, WhatsApp)</span>
            </div>
            <div style="margin-bottom: 12px;">
              <span style="background: rgba(0,255,174,0.1); color: #00ffae; padding: 4px 10px; border-radius: 50%; font-size: 12px; font-weight: 800; margin-right: 10px;">2</span>
              <span style="color: rgba(255,255,255,0.7); font-size: 13px;">Adicione categorias e produtos ao cardápio</span>
            </div>
            <div>
              <span style="background: rgba(0,255,174,0.1); color: #00ffae; padding: 4px 10px; border-radius: 50%; font-size: 12px; font-weight: 800; margin-right: 10px;">3</span>
              <span style="color: rgba(255,255,255,0.7); font-size: 13px;">Grave vídeos dos seus pratos e publique</span>
            </div>
          </div>
          <a href="https://fymenu.com/painel" style="display: block; text-align: center; padding: 14px 24px; background: linear-gradient(135deg, rgba(0,255,174,0.15), rgba(0,217,255,0.1)); color: #00ffae; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 12px;">
            Acessar meu painel →
          </a>
        </div>
        <div style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.04); text-align: center;">
          <p style="color: rgba(255,255,255,0.2); font-size: 11px; margin: 0;">
            FyMenu · Cardápio Digital de Vídeo · fymenu.com
          </p>
        </div>
      </div>
    `,
  };
}

export function subscriptionConfirmedEmail(
  name: string,
  plan: string,
  value: string,
): { subject: string; html: string } {
  return {
    subject: `Assinatura ${plan} confirmada ✅`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #050505; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #00ffae, #00d9ff); padding: 24px; text-align: center;">
          <h1 style="color: #000; font-size: 24px; font-weight: 900; margin: 0;">FyMenu</h1>
        </div>
        <div style="padding: 32px 24px; color: #fff;">
          <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 12px;">Pagamento confirmado! ✅</h2>
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6;">
            Olá ${name}, seu plano <strong style="color: #00ffae;">${plan}</strong> foi ativado com sucesso.
          </p>
          <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px; margin: 20px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
              <tr>
                <td style="color: rgba(255,255,255,0.4); font-size: 13px; padding-bottom: 8px;">Plano</td>
                <td style="color: #fff; font-size: 13px; font-weight: 700; text-align: right; padding-bottom: 8px;">${plan}</td>
              </tr>
              <tr>
                <td style="color: rgba(255,255,255,0.4); font-size: 13px;">Valor</td>
                <td style="color: #00ffae; font-size: 13px; font-weight: 700; text-align: right;">${value}</td>
              </tr>
            </table>
          </div>
          <a href="https://fymenu.com/painel" style="display: block; text-align: center; padding: 14px; background: rgba(0,255,174,0.1); color: #00ffae; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 12px;">
            Ir pro painel →
          </a>
        </div>
        <div style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.04); text-align: center;">
          <p style="color: rgba(255,255,255,0.2); font-size: 11px; margin: 0;">FyMenu · fymenu.com</p>
        </div>
      </div>
    `,
  };
}

export function paymentReminderEmail(
  name: string,
  plan: string,
  dueDate: string,
): { subject: string; html: string } {
  return {
    subject: `Lembrete: pagamento do plano ${plan} vence em breve`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #050505; border-radius: 16px; overflow: hidden;">
        <div style="background: #fbbf24; padding: 24px; text-align: center;">
          <h1 style="color: #000; font-size: 24px; font-weight: 900; margin: 0;">FyMenu</h1>
        </div>
        <div style="padding: 32px 24px; color: #fff;">
          <h2 style="font-size: 18px; font-weight: 800; margin: 0 0 12px;">Lembrete de pagamento ⏰</h2>
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6;">
            Olá ${name}, o pagamento do seu plano <strong>${plan}</strong> vence em <strong style="color: #fbbf24;">${dueDate}</strong>.
          </p>
          <p style="color: rgba(255,255,255,0.4); font-size: 13px; line-height: 1.6; margin-top: 12px;">
            Mantenha seu cardápio publicado renovando seu plano.
          </p>
          <a href="https://fymenu.com/painel" style="display: block; text-align: center; padding: 14px; margin-top: 20px; background: rgba(251,191,36,0.1); color: #fbbf24; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 12px;">
            Verificar pagamento →
          </a>
        </div>
        <div style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.04); text-align: center;">
          <p style="color: rgba(255,255,255,0.2); font-size: 11px; margin: 0;">FyMenu · fymenu.com</p>
        </div>
      </div>
    `,
  };
}

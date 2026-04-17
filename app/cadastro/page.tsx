import { redirect } from "next/navigation";

export default function CadastroPage() {
  redirect("/entrar?modo=criar");
}

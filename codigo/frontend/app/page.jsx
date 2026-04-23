import { redirect } from "next/navigation";

// Raiz redireciona sempre para /dashboard
export default function RootPage() {
  redirect("/dashboard");
}

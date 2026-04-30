import { redirect } from "next/navigation";

export default function ClienteRedirect() {
  redirect("/login");
}

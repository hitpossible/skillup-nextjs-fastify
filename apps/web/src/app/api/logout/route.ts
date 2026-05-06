import { redirect } from "next/navigation";
import { logoutAction } from "@/lib/auth";

export async function POST() {
  await logoutAction();
  redirect("/login");
}

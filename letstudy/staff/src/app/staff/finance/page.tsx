import { requireStaffModule } from "@/lib/permissions";
import FinanceClient from "./FinanceClient";

export default async function StaffFinancePage() {
  await requireStaffModule("FINANCE");
  return <FinanceClient />;
}

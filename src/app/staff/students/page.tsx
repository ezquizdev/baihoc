import { controllerAdminListUsers } from "@/application/controllers/userAdminController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { ManageStudentsScreen } from "@/components/manage-students/manage-students-screen";

export default async function StaffStudentsPage() {
  const session = await requireAuthenticatedPage({
    next: "/staff/students",
    role: "staff",
  });
  const initialLimit = 20;
  const initial = await controllerAdminListUsers({
    role: "student",
    status: "active",
    limit: initialLimit,
    offset: 0,
  });

  return (
    <ManageStudentsScreen
      session={session}
      initialItems={initial.items}
      initialTotal={initial.total}
      initialLimit={initialLimit}
    />
  );
}

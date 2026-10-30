import "./AdminUsersPage.css";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import type { AdminUserDto, UserRole } from "@/api/endpoints";
import {
  useAdminUsers,
  useUpdateUserModules,
  useUpdateUserRole,
} from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { toast } from "@/state/toasts";

type ModuleKey = "company" | "lmnp";

/** Admin-only page: per-account role and module activation. */
export function AdminUsersPage() {
  const { t } = useTranslation();
  const accounts = useAdminUsers();
  const modules = useUpdateUserModules();
  const role = useUpdateUserRole();
  const pending = modules.isPending || role.isPending;

  async function toggleModule(
    account: AdminUserDto,
    module: ModuleKey,
    enabled: boolean,
  ) {
    try {
      await modules.mutateAsync({
        id: account.id,
        flags:
          module === "company"
            ? { companyEnabled: enabled }
            : { lmnpEnabled: enabled },
      });
      toast.success(t("adminUsers.page.modulesUpdated"));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function changeRole(account: AdminUserDto, nextRole: UserRole) {
    try {
      await role.mutateAsync({ id: account.id, role: nextRole });
      toast.success(t("adminUsers.page.roleUpdated"));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t("adminUsers.page.eyebrow")}
        title={t("adminUsers.page.title")}
        description={t("adminUsers.page.description")}
      />

      {accounts.isPending ? (
        <LoadingState message={t("adminUsers.page.loading")} />
      ) : accounts.isError ? (
        <ErrorState
          message={errorMessage(accounts.error)}
          onRetry={() => void accounts.refetch()}
        />
      ) : (accounts.data ?? []).length === 0 ? (
        <EmptyState title={t("adminUsers.page.empty")} />
      ) : (
        <div className="card admin-users-table-wrapper" data-cy="admin-users">
          <table
            className="admin-users-table"
            aria-label={t("adminUsers.page.tableCaption")}
          >
            <thead>
              <tr>
                <th scope="col">{t("adminUsers.page.email")}</th>
                <th scope="col">{t("adminUsers.page.role")}</th>
                <th scope="col">{t("adminUsers.page.modules")}</th>
              </tr>
            </thead>
            <tbody>
              {(accounts.data ?? []).map((account) => (
                <tr key={account.id} data-cy={`admin-user-${account.id}`}>
                  <td className="admin-users-email">{account.email}</td>
                  <td>
                    <select
                      className="admin-users-select"
                      aria-label={t("adminUsers.page.role")}
                      value={account.role}
                      disabled={pending}
                      onChange={(event) =>
                        void changeRole(account, event.target.value as UserRole)
                      }
                    >
                      <option value="USER">
                        {t("adminUsers.page.roles.user")}
                      </option>
                      <option value="ADMIN">
                        {t("adminUsers.page.roles.admin")}
                      </option>
                    </select>
                  </td>
                  <td>
                    <div className="admin-users-modules">
                      <label className="admin-users-toggle">
                        <input
                          type="checkbox"
                          aria-label={t("adminUsers.page.companyModule")}
                          checked={account.companyEnabled}
                          disabled={pending}
                          onChange={(event) =>
                            void toggleModule(
                              account,
                              "company",
                              event.target.checked,
                            )
                          }
                        />
                        <span>{t("adminUsers.page.companyModule")}</span>
                      </label>
                      <label className="admin-users-toggle">
                        <input
                          type="checkbox"
                          aria-label={t("adminUsers.page.lmnpModule")}
                          checked={account.lmnpEnabled}
                          disabled={pending}
                          onChange={(event) =>
                            void toggleModule(
                              account,
                              "lmnp",
                              event.target.checked,
                            )
                          }
                        />
                        <span>{t("adminUsers.page.lmnpModule")}</span>
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

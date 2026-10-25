import "./ExpenseItemsManager.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useExpenseItems } from "@/api/queries";
import type { ExpenseItemDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { formatPercentage } from "@/lib/format";
import { toast } from "@/state/toasts";
import { ExpenseItemForm } from "./ExpenseItemForm";
import { PERIODICITIES } from "./settingsValues";

/** List of expense items with create/edit/delete actions. */
export function ExpenseItemsManager({
  companyId,
  leaseId,
  defaultProRata: defaultProRata,
}: {
  companyId: number;
  leaseId: number | null;
  defaultProRata: string;
}) {
  const queryClient = useQueryClient();
  const expenseItems = useExpenseItems(companyId, true, leaseId);
  const [formOpen, setFormOpen] = useState(false);
  const [editedItem, setEditedItem] = useState<ExpenseItemDto | null>(null);
  const [toDelete, setToDelete] = useState<ExpenseItemDto | null>(null);

  const remove = useMutation({
    mutationFn: (expenseItem: ExpenseItemDto) =>
      api.expenseItems.delete(expenseItem.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenseItemsAll,
      });
      setToDelete(null);
      toast.success("Poste désactivé et retiré de la liste des frais.");
    },
    onError: (error) => {
      setToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  const list = expenseItems.data ?? [];
  const defaultOrder =
    list.reduce(
      (maximum, expenseItem) => Math.max(maximum, expenseItem.sortOrder ?? 0),
      -1,
    ) + 1;

  function openCreate() {
    setEditedItem(null);
    setFormOpen(true);
  }

  function openEdit(expenseItem: ExpenseItemDto) {
    setEditedItem(expenseItem);
    setFormOpen(true);
  }

  return (
    <section className="card expense-items-manager">
      <div className="card-header">
        <div className="expense-items-manager-heading">
          <span className="expense-items-manager-icon">
            <ReceiptText size={17} aria-hidden="true" />
          </span>
          <div>
            <h2 className="expense-items-manager-title">Types de frais</h2>
            <p className="expense-items-manager-description">
              Libellés, fournisseurs, prorata par défaut et périodicité
              alimentent la note de frais. Suppression logique uniquement.
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          small
          icon={<Plus size={14} />}
          onClick={openCreate}
          disabled={formOpen && editedItem === null}
          data-cy="btn-ajouter-poste"
        >
          Ajouter un type
        </Button>
      </div>

      <div className="card-body expense-items-manager-body">
        {formOpen ? (
          <ExpenseItemForm
            item={editedItem}
            companyId={companyId}
            leaseId={leaseId}
            defaultProRata={defaultProRata}
            defaultOrder={defaultOrder}
            onClose={() => {
              setFormOpen(false);
              setEditedItem(null);
            }}
          />
        ) : null}

        {expenseItems.isError ? (
          <ErrorState
            message={errorMessage(expenseItems.error)}
            onRetry={() => void expenseItems.refetch()}
          />
        ) : expenseItems.isPending ? (
          <LoadingState message="Chargement des postes…" />
        ) : list.length === 0 ? (
          <p className="expense-items-manager-empty">
            Aucun poste configuré. Ajoutez au moins « Loyer » et vos frais
            courants.
          </p>
        ) : (
          <div className="expense-items-manager-table-wrapper">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Libellé</th>
                  <th>Fournisseur</th>
                  <th className="text-right">Prorata</th>
                  <th>Périodicité</th>
                  <th className="text-center">Ordre</th>
                  <th>Options</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((expenseItem) => (
                  <tr
                    key={expenseItem.id}
                    className={cn(!expenseItem.active && "opacity-60")}
                  >
                    <td>
                      <div className="expense-items-manager-item">
                        <span className="expense-items-manager-item-label">
                          {expenseItem.label}
                        </span>
                        <code className="expense-items-manager-item-code">
                          {expenseItem.code}
                        </code>
                        {!expenseItem.active ? (
                          <span className="badge badge-neutral">inactif</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="text-ink-soft">
                      {expenseItem.supplier || "—"}
                    </td>
                    <td className="number expense-items-manager-number-cell">
                      {formatPercentage(expenseItem.proRataPct)}
                    </td>
                    <td className="expense-items-manager-periodicity-cell">
                      {PERIODICITIES.find(
                        (periodicity) =>
                          periodicity.value === expenseItem.periodicity,
                      )?.label ?? expenseItem.periodicity}
                    </td>
                    <td className="number expense-items-manager-order-cell">
                      {expenseItem.sortOrder}
                    </td>
                    <td>
                      {expenseItem.multipleLinesAllowed ? (
                        <span className="badge badge-accent">multi-lignes</span>
                      ) : (
                        <span className="expense-items-manager-single-line">
                          une ligne
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="expense-items-manager-actions">
                        <Button
                          variant="ghost"
                          small
                          icon={<PencilLine size={13} />}
                          onClick={() => openEdit(expenseItem)}
                          data-cy={`btn-modifier-poste-${expenseItem.code}`}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          small
                          icon={<Trash2 size={13} />}
                          className="text-danger hover:bg-danger-soft"
                          onClick={() => setToDelete(expenseItem)}
                          data-cy={`btn-supprimer-poste-${expenseItem.code}`}
                        >
                          Retirer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Retirer ce type de frais ?"
        message={
          toDelete
            ? `« ${toDelete.label} » ne sera plus proposé dans la note de frais. Les documents existants conservent leurs lignes et leurs montants.`
            : ""
        }
        confirmLabel="Retirer le poste"
        variant="danger"
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onCancel={() => setToDelete(null)}
        dataCy="dialogue-supprimer-poste"
      />
    </section>
  );
}

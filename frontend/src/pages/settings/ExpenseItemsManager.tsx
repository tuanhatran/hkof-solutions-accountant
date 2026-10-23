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
  defaultProRata: defaultProRata,
}: {
  defaultProRata: string;
}) {
  const queryClient = useQueryClient();
  const expenseItems = useExpenseItems(true);
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
    <section className="card mt-6 overflow-hidden">
      <div className="card-header">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
            <ReceiptText size={17} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl text-ink">Types de frais</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
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

      <div className="card-body space-y-4">
        {formOpen ? (
          <ExpenseItemForm
            item={editedItem}
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
          <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-soft">
            Aucun poste configuré. Ajoutez au moins « Loyer » et vos frais
            courants.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-ink">
                          {expenseItem.label}
                        </span>
                        <code className="rounded bg-paper-deep/60 px-1 py-0.5 font-mono text-[10.5px] text-ink-soft">
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
                    <td className="number text-right text-ink-soft">
                      {formatPercentage(expenseItem.proRataPct)}
                    </td>
                    <td className="text-xs capitalize text-ink-soft">
                      {PERIODICITIES.find(
                        (periodicity) =>
                          periodicity.value === expenseItem.periodicity,
                      )?.label ?? expenseItem.periodicity}
                    </td>
                    <td className="number text-center text-ink-soft">
                      {expenseItem.sortOrder}
                    </td>
                    <td>
                      {expenseItem.multipleLinesAllowed ? (
                        <span className="badge badge-accent">multi-lignes</span>
                      ) : (
                        <span className="text-xs text-ink-soft">une ligne</span>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
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

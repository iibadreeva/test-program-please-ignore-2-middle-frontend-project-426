import type { OrderProblemItem } from "@/shared/api-contract";
import type { CheckoutFormState } from "@/features/checkout/actions";

function formatProblem(problem: OrderProblemItem): string {
  if (problem.reason === "not_found") {
    return `Товар не найден (${problem.productId})`;
  }
  const title = problem.title ?? problem.productId;
  return `«${title}»: запрошено ${problem.requested}, доступно ${problem.available}`;
}

export function OrderErrorBlock({ state }: { state: CheckoutFormState }) {
  const hasError = Boolean(state.message || state.problems?.length);
  if (!hasError) return null;

  return (
    <div className="text-danger space-y-2 text-sm" role="alert" data-testid="order-error">
      {state.message ? <p>{state.message}</p> : null}
      {state.problems && state.problems.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5">
          {state.problems.map((problem) => (
            <li key={`${problem.productId}-${problem.reason}`}>{formatProblem(problem)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

import {
  CartForm,
  OptimisticInput,
  useOptimisticData,
} from "@shopify/hydrogen";
import type {
  Cart,
  CartCost,
  CartLine,
  CartLineUpdateInput,
  ComponentizableCartLine,
} from "@shopify/hydrogen/storefront-api-types";
import {
  flattenConnection,
  Image,
  Money,
  ShopPayButton,
} from "@shopify/hydrogen-react";
import clsx from "clsx";

import Button, { defaultButtonStyles } from "~/components/elements/Button";
import MinusCircleIcon from "~/components/icons/MinusCircle";
import PlusCircleIcon from "~/components/icons/PlusCircle";
import RemoveIcon from "~/components/icons/Remove";
import SpinnerIcon from "~/components/icons/Spinner";
import { Link } from "~/components/Link";
import { useCartFetchers } from "~/hooks/useCartFetchers";
import { useRootLoaderData } from "~/root";

import { Label } from "../global/Label";

export function Cart({
  cart,
  layout,
  loading,
  storeDomain,
  onClose,
}: {
  cart?: Cart;
  layout: "drawer" | "page";
  loading?: boolean;
  onClose?: () => void;
  storeDomain: string;
}) {
  let totalQuantity = cart?.totalQuantity;
  const optimisticData = useOptimisticData<{
    action?: string;
    line?: CartLine;
    lineId?: string;
  }>("cart-line-item");

  if (optimisticData?.action === "remove" && optimisticData?.lineId) {
    const nextCartLines = cart?.lines?.nodes.filter(
      (line) => line.id !== optimisticData.lineId
    );
    if (nextCartLines?.length === 0) {
      totalQuantity = 0;
    }
  } else if (optimisticData?.action === "add") {
    totalQuantity = optimisticData?.line?.quantity;
  }

  const empty = !cart || Boolean(totalQuantity === 0);

  return (
    <>
      {!loading && empty ? (
        <CartEmpty layout={layout} onClose={onClose} />
      ) : (
        <CartDetails cart={cart} layout={layout} onClose={onClose} />
      )}
    </>
  );
}

function CartDetails({
  cart,
  layout,
  onClose,
}: {
  cart?: Cart;
  layout: "drawer" | "page";
  onClose?: () => void;
}) {
  const { storeDomain } = useRootLoaderData();

  return (
    <div className="flex flex-col">
      <CartLineItems linesObj={cart?.lines} />
      {cart?.cost && <CartSummary cost={cart.cost} />}
      {cart && <CartActions cart={cart} storeDomain={storeDomain} />}
    </div>
  );
}

export function CartLineItems({
  linesObj,
}: {
  linesObj: Cart["lines"] | undefined;
}) {
  const lines = flattenConnection(linesObj);
  return (
    <div className="flex-grow px-8" role="table" aria-label="Shopping cart">
      <div role="row" className="sr-only">
        <div role="columnheader">Product image</div>
        <div role="columnheader">Product details</div>
        <div role="columnheader">Price</div>
      </div>
      {lines.map((line) => {
        return <LineItem key={line.id} lineItem={line} />;
      })}
    </div>
  );
}

function LineItem({
  lineItem,
}: {
  lineItem: CartLine | ComponentizableCartLine;
}) {
  const { merchandise } = lineItem;
  const optimisticId = lineItem.id;
  const optimisticData = useOptimisticData<{
    action: string;
    quantity?: number;
  }>(optimisticId);

  const updatingItems = useCartFetchers(CartForm.ACTIONS.LinesUpdate);
  const removingItems = useCartFetchers(CartForm.ACTIONS.LinesRemove);

  // Determine if the line item is currently being updated or removed
  const isUpdating = updatingItems.some((fetcher) => {
    const formData = fetcher.formData;
    if (formData) {
      const formInputs = CartForm.getFormInput(formData);
      return (
        Array.isArray(formInputs?.inputs?.lines) &&
        formInputs.inputs.lines.some(
          (line: CartLineUpdateInput) => line.id === lineItem.id
        )
      );
    }
    return false;
  });

  const isRemoving = removingItems.some((fetcher) => {
    const formData = fetcher.formData;
    if (formData) {
      const formInputs = CartForm.getFormInput(formData);
      return (
        Array.isArray(formInputs?.inputs?.lineIds) &&
        formInputs.inputs.lineIds.includes(lineItem.id)
      );
    }
    return false;
  });

  // Apply optimistic data and determine final states
  const isRemoved = optimisticData?.action === "remove" || isRemoving;
  const quantity = optimisticData?.quantity ?? lineItem.quantity;
  const isLoading =
    isUpdating || isRemoving || optimisticData?.action === "add";

  // Check for default variant
  const firstVariant = merchandise.selectedOptions[0];
  const hasDefaultVariantOnly =
    firstVariant.name === "Title" && firstVariant.value === "Default Title";

  return (
    <div
      role="row"
      className={clsx(
        "flex items-center border-b border-lightGray py-3 last:border-b-0",
        isRemoved && "opacity-50"
      )}
      style={{
        display: isRemoved ? "none" : "flex",
      }}
    >
      {/* Image */}
      <div role="cell" className="mr-3 aspect-square w-[66px] flex-shrink-0">
        {merchandise.image && (
          <Link to={`/products/${merchandise.product.handle}`}>
            <Image
              className="rounded"
              data={merchandise.image}
              width={110}
              height={110}
              alt={merchandise.title}
            />
          </Link>
        )}
      </div>

      {/* Title and Options */}
      <div
        role="cell"
        className="flex-grow-1 mr-4 flex w-full flex-col items-start"
      >
        <Link
          to={`/products/${merchandise.product.handle}`}
          className="text-sm font-bold hover:underline"
        >
          {merchandise.product.title}
        </Link>

        {!hasDefaultVariantOnly && (
          <ul className="mt-1 space-y-1 text-xs text-darkGray">
            {merchandise.selectedOptions.map(({ name, value }) => (
              <li key={name}>
                {name}: {value}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quantity Controls */}
      <CartItemQuantity line={lineItem} optimisticId={optimisticId} />

      {/* Price */}
      <div className="ml-4 mr-6 flex min-w-[4rem] justify-end text-sm font-bold leading-none">
        {isLoading ? (
          <SpinnerIcon width={24} height={24} />
        ) : (
          <Money data={lineItem.cost.totalAmount} />
        )}
      </div>

      {/* Remove Button */}
      <div role="cell" className="flex flex-col items-end justify-between">
        <ItemRemoveButton lineIds={[lineItem.id]} optimisticId={optimisticId} />
      </div>
    </div>
  );
}
function CartItemQuantity({
  line,
  optimisticId,
}: {
  line: CartLine | ComponentizableCartLine;
  optimisticId: string;
}) {
  if (!line || typeof line?.quantity === "undefined") return null;
  const { id: lineId, quantity } = line;
  const optimisticData = useOptimisticData<{
    action: string;
    quantity?: number;
  }>(optimisticId);

  const lineQuantity = optimisticData?.quantity ?? quantity;

  const prevQuantity = Math.max(0, lineQuantity - 1);
  const nextQuantity = lineQuantity + 1;

  return (
    <div className="flex items-center gap-2">
      <UpdateCartButton
        lines={[{ id: lineId, quantity: prevQuantity }]}
        optimisticId={optimisticId}
        currentQuantity={lineQuantity}
      >
        <button
          aria-label="Decrease quantity"
          value={prevQuantity}
          disabled={lineQuantity <= 1}
        >
          <MinusCircleIcon />
        </button>
      </UpdateCartButton>

      <div className="min-w-[1rem] text-center text-sm font-bold leading-none text-black">
        {lineQuantity}
      </div>

      <UpdateCartButton
        lines={[{ id: lineId, quantity: nextQuantity }]}
        optimisticId={optimisticId}
        currentQuantity={lineQuantity}
      >
        <button aria-label="Increase quantity" value={nextQuantity}>
          <PlusCircleIcon />
        </button>
      </UpdateCartButton>
    </div>
  );
}

function UpdateCartButton({
  children,
  lines,
  optimisticId,
  currentQuantity,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
  optimisticId: string;
  currentQuantity: number;
}) {
  const newQuantity = lines[0].quantity;

  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{ lines }}
    >
      {children}
      <OptimisticInput
        id={optimisticId}
        data={{ action: "update", quantity: newQuantity }}
      />
    </CartForm>
  );
}

function ItemRemoveButton({
  lineIds,
  optimisticId,
}: {
  lineIds: CartLine["id"][];
  optimisticId: string;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{ lineIds }}
    >
      <button
        className="disabled:pointer-events-all disabled:cursor-wait"
        type="submit"
      >
        <RemoveIcon />
      </button>
      <OptimisticInput id={optimisticId} data={{ action: "remove" }} />
    </CartForm>
  );
}

export function CartSummary({ cost }: { cost: CartCost }) {
  return (
    <>
      <div role="table" aria-label="Cost summary" className="text-sm">
        <div
          className="flex justify-between border-t border-gray p-4"
          role="row"
        >
          <span className="text-darkGray" role="rowheader">
            <Label _key="cart.subtotal" />
          </span>
          <span role="cell" className="text-right font-bold">
            {cost?.subtotalAmount?.amount ? (
              <Money data={cost?.subtotalAmount} />
            ) : (
              "-"
            )}
          </span>
        </div>

        <div
          role="row"
          className="flex justify-between border-t border-gray p-4"
        >
          <span className="text-darkGray" role="rowheader">
            <Label _key="cart.shipping" />
          </span>
          <span role="cell" className="font-bold uppercase">
            <Label _key="cart.calculatedAtCheckout" />
          </span>
        </div>
      </div>
    </>
  );
}

export function CartActions({
  cart,
  storeDomain,
}: {
  cart: Cart;
  storeDomain: string;
}) {
  if (!cart || !cart.checkoutUrl) return null;

  const shopPayLineItems = flattenConnection(cart.lines).map((line) => ({
    id: line.merchandise.id,
    quantity: line.quantity,
  }));

  return (
    <div className="flex w-full gap-3">
      <ShopPayButton
        className={clsx([defaultButtonStyles({ tone: "shopPay" }), "w-1/2"])}
        variantIdsAndQuantities={shopPayLineItems}
        storeDomain={storeDomain}
      />
      <Button
        to={cart.checkoutUrl}
        className={clsx([defaultButtonStyles(), "w-1/2"])}
      >
        <Label _key="cart.checkout" />
      </Button>
    </div>
  );
}

function CartEmpty({
  layout,
  onClose,
}: {
  layout: "drawer" | "page";
  onClose?: () => void;
}) {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <p className="font-semibold mb-6 text-lg">Your cart is empty</p>
      {onClose && (
        <button onClick={onClose} className="text-blue-500 hover:text-blue-600">
          Continue Shopping
        </button>
      )}
    </div>
  );
}

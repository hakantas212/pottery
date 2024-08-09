import { type FetcherWithComponents, useFetcher } from "@remix-run/react";
import {
  AnalyticsEventName,
  CartForm,
  getClientBrowserParameters,
  OptimisticInput,
  useOptimisticData,
  sendShopifyAnalytics,
  type ShopifyAddToCartPayload,
} from "@shopify/hydrogen";
import type { CartLineInput } from "@shopify/hydrogen/storefront-api-types";
import { useEffect } from "react";
import { twMerge } from "tailwind-merge";

import { defaultButtonStyles } from "~/components/elements/Button";
import { Label } from "~/components/global/Label";
import SpinnerIcon from "~/components/icons/Spinner";
import { usePageAnalytics } from "~/hooks/usePageAnalytics";

type FormMode = "default" | "inline";

export default function AddToCartButton({
  children = <Label _key="cart.addToCart" />,
  lines,
  analytics,
  mode = "default",
  buttonClassName,
  ...props
}: {
  children?: React.ReactNode;
  lines: CartLineInput[];
  analytics?: unknown;
  mode?: FormMode;
  buttonClassName?: string;
  [key: string]: any;
}) {
  const optimisticId = `optimistic-${lines[0].merchandiseId}`;

  return (
    // We can't pass a className to CartForm, so we have to wrap it in a div with a className instead
    <div className={mode === "inline" ? "[&>*]:inline" : ""}>
      <CartForm
        route={`/cart`}
        action={CartForm.ACTIONS.LinesAdd}
        inputs={{ lines }}
      >
        {(fetcher: FetcherWithComponents<any>) => (
          <>
            <OptimisticInput
              id={optimisticId}
              data={{ action: "add", line: lines[0] }}
            />
            <button
              className={
                mode === "default"
                  ? twMerge(defaultButtonStyles(), buttonClassName)
                  : buttonClassName
              }
              {...props}
              disabled={fetcher.state !== "idle" || props.disabled}
            >
              {fetcher.state !== "idle" ? (
                <SpinnerIcon width={24} height={24} />
              ) : (
                children
              )}
            </button>
          </>
        )}
      </CartForm>
    </div>
  );
}

export function AddToCartLink({
  children = <Label _key="cart.addToCart" />,
  lines,
  analytics,
  mode = "default",
  buttonClassName,
  loadingContent,
  ...props
}: {
  children?: React.ReactNode;
  lines: CartLineInput[];
  analytics?: unknown;
  mode?: FormMode;
  buttonClassName?: string;
  loadingContent?: React.ReactNode;
  [key: string]: any;
}) {
  const fetcher = useFetcher();
  const optimisticId = `optimistic-${lines[0].merchandiseId}`;

  const onClick = () =>
    fetcher.submit(
      {
        cartFormInput: JSON.stringify({
          action: CartForm.ACTIONS.LinesAdd,
          inputs: {
            lines,
          },
        }),
        analytics: JSON.stringify(analytics),
      },
      { method: "post", action: "/cart?index" }
    );

  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesAdd}
      inputs={{ lines }}
    >
      <>
        <OptimisticInput
          id={optimisticId}
          data={{ action: "add", line: lines[0] }}
        />
        <button
          className={
            mode === "default"
              ? twMerge(defaultButtonStyles(), buttonClassName)
              : buttonClassName
          }
          onClick={onClick}
          {...props}
        >
          {fetcher.state === "submitting" && loadingContent
            ? loadingContent
            : children}
        </button>
      </>
    </CartForm>
  );
}

function AddToCartAnalytics({
  fetcher,
  children,
}: {
  fetcher: FetcherWithComponents<any>;
  children: React.ReactNode;
}): JSX.Element {
  const fetcherData = fetcher.data;
  const formData = fetcher.formData;
  const pageAnalytics = usePageAnalytics({ hasUserConsent: true });

  useEffect(() => {
    if (formData) {
      const cartData: Record<string, unknown> = {};
      const cartInputs = CartForm.getFormInput(formData);

      try {
        if (cartInputs.inputs.analytics) {
          const dataInForm: unknown = JSON.parse(
            String(cartInputs.inputs.analytics)
          );
          Object.assign(cartData, dataInForm);
        }
      } catch {
        // do nothing
      }

      if (Object.keys(cartData).length && fetcherData) {
        const addToCartPayload: ShopifyAddToCartPayload = {
          ...getClientBrowserParameters(),
          ...pageAnalytics,
          ...cartData,
          cartId: fetcherData.cart.id,
        };

        sendShopifyAnalytics({
          eventName: AnalyticsEventName.ADD_TO_CART,
          payload: addToCartPayload,
        });
      }
    }
  }, [fetcherData, formData, pageAnalytics]);
  return <>{children}</>;
}

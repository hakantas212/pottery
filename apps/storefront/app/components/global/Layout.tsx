import { usePreviewContext } from "hydrogen-sanity";

import Footer from "~/components/global/Footer";
import { ShopifyProvider } from "@shopify/hydrogen-react";

import Header from "~/components/global/Header";
import { PreviewBanner } from "~/components/preview/PreviewBanner";
import { useRootLoaderData } from "~/root";

import { Label } from "./Label";

type LayoutProps = {
  backgroundColor?: string;
  children: React.ReactNode;
};

export function Layout({ backgroundColor, children }: LayoutProps) {
  const isPreview = Boolean(usePreviewContext());
  const { env } = useRootLoaderData();

  return (
    <ShopifyProvider
      storeDomain={env.PUBLIC_STORE_DOMAIN || ""}
      storefrontToken={env.PUBLIC_STOREFRONT_API_TOKEN || ""}
      storefrontApiVersion={env.PUBLIC_STOREFRONT_API_VERSION || "2023-07"}
      countryIsoCode="US"
      languageIsoCode="EN"
    >
      <>
        <div className="absolute left-0 top-0">
          <a
            href="#mainContent"
            className="sr-only p-4 focus:not-sr-only focus:block"
          >
            <Label _key="global.skipToContent" />
          </a>
        </div>

        <div
          className="max-w-screen flex min-h-screen flex-col"
          style={{ background: backgroundColor }}
        >
          <Header />

          <main className="relative grow" id="mainContent" role="main">
            <div className="mx-auto pb-overlap">{children}</div>
          </main>
        </div>

        <Footer />

        {isPreview ? <PreviewBanner /> : <></>}
      </>
    </ShopifyProvider>
  );
}

import {
  isRouteErrorResponse,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useMatches,
  useRouteError,
} from "@remix-run/react";
import {
  Seo,
  type SeoHandleFunction,
  ShopifySalesChannel,
} from "@shopify/hydrogen";
import { useNonce } from "@shopify/hydrogen";
import type { Collection, Shop } from "@shopify/hydrogen/storefront-api-types";
import {
  defer,
  type LoaderFunctionArgs,
  type MetaFunction,
  type SerializeFrom,
} from "@shopify/remix-oxygen";

import { GenericError } from "~/components/global/GenericError";
import { Layout } from "~/components/global/Layout";
import { NotFound } from "~/components/global/NotFound";
import { useAnalytics } from "~/hooks/useAnalytics";
import { DEFAULT_LOCALE } from "~/lib/utils";
import { LAYOUT_QUERY } from "~/queries/sanity/layout";
import { COLLECTION_QUERY_ID } from "~/queries/shopify/collection";
import type { I18nLocale } from "~/types/shopify";

import { baseLanguage } from "./data/countries";
import type { SanityLayout } from "./lib/sanity";

export const meta: MetaFunction = () => [
  {
    name: "viewport",
    content: "width=device-width,initial-scale=1",
  },
];

const seo: SeoHandleFunction<typeof loader> = ({ data }) => ({
  title: data?.layout?.seo?.title,
  titleTemplate: `%s${
    data?.layout?.seo?.title ? ` · ${data?.layout?.seo?.title}` : ""
  }`,
  description: data?.layout?.seo?.description,
});

export const handle = {
  seo,
};

export async function loader({ context }: LoaderFunctionArgs) {
  const { cart, env } = context;

  const cache = context.storefront.CacheCustom({
    mode: "public",
    maxAge: 60,
    staleWhileRevalidate: 60,
  });

  const [shop, layout] = await Promise.all([
    context.storefront.query<{ shop: Shop }>(SHOP_QUERY),
    context.sanity.query<SanityLayout>({
      query: LAYOUT_QUERY,
      cache,
      params: {
        language: context.storefront.i18n.language.toLowerCase(),
        baseLanguage,
      },
    }),
  ]);

  const selectedLocale = context.storefront.i18n as I18nLocale;

  return defer({
    analytics: {
      shopifySalesChannel: ShopifySalesChannel.hydrogen,
      shopId: shop.shop.id,
    },
    cart: cart.get(),
    layout,
    notFoundCollection: layout?.notFoundPage?.collectionGid
      ? context.storefront.query<{ collection: Collection }>(
          COLLECTION_QUERY_ID,
          {
            variables: {
              id: layout.notFoundPage.collectionGid,
              count: 16,
            },
          }
        )
      : undefined,
    env: {
      /*
       * Be careful not to expose any sensitive environment variables here.
       */
      PUBLIC_STORE_DOMAIN: env.PUBLIC_STORE_DOMAIN,
      PUBLIC_STOREFRONT_API_TOKEN: env.PUBLIC_STOREFRONT_API_TOKEN,
      PUBLIC_STOREFRONT_API_VERSION: env.PUBLIC_STOREFRONT_API_VERSION,
    },
    sanityProjectID: context.env.SANITY_PROJECT_ID,
    sanityDataset: context.env.SANITY_DATASET || "production",
    selectedLocale,
    storeDomain: context.storefront.getShopifyDomain(),
  });
}

export default function App() {
  const data = useLoaderData<SerializeFrom<typeof loader>>();
  const locale = data.selectedLocale ?? DEFAULT_LOCALE;
  const hasUserConsent = true;
  const nonce = useNonce();

  useAnalytics(hasUserConsent);

  return (
    <html lang={locale.language}>
      <head>
        <meta charSet="utf-8" />
        <Seo />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet key={`${locale.language}-${locale.country}`} />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <LiveReload nonce={nonce} />
      </body>
    </html>
  );
}

export const useRootLoaderData = () => {
  const [root] = useMatches();
  return root?.data as SerializeFrom<typeof loader>;
};

export function ErrorBoundary({ error }: { error: Error }) {
  const nonce = useNonce();

  const routeError = useRouteError();
  const isRouteError = isRouteErrorResponse(routeError);

  const rootData = useRootLoaderData();

  const {
    selectedLocale: locale,
    layout,
    notFoundCollection,
  } = rootData
    ? rootData
    : {
        selectedLocale: DEFAULT_LOCALE,
        layout: null,
        notFoundCollection: undefined,
      };
  const { notFoundPage } = layout || {};

  let title = "Error";
  if (isRouteError) {
    title = "Not found";
  }

  return (
    <html lang={locale.language}>
      <head>
        <meta charSet="utf-8" />
        <title>{title}</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Layout
          key={`${locale.language}-${locale.country}`}
          backgroundColor={notFoundPage?.colorTheme?.background}
        >
          {isRouteError ? (
            <>
              {routeError.status === 404 ? (
                <NotFound
                  notFoundPage={notFoundPage}
                  notFoundCollection={notFoundCollection}
                />
              ) : (
                <GenericError
                  error={{ message: `${routeError.status} ${routeError.data}` }}
                />
              )}
            </>
          ) : (
            <GenericError error={error instanceof Error ? error : undefined} />
          )}
        </Layout>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <LiveReload nonce={nonce} />
      </body>
    </html>
  );
}

const SHOP_QUERY = `#graphql
  query layout($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
      shop {
        id
        name
        description
      }
    }
`;

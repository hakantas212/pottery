import { useRootLoaderData } from "~/root";

type props = {
  _key: string;
  replacements?: Record<string, string>;
};

export function Label(props: props) {
  const { _key, replacements } = props;
  const { layout } = useRootLoaderData();
  const labels = layout?.labels || [];

  console.log("Label key:", _key); // Log the key

  let label = labels.find(({ key }: { key: string }) => key === _key)?.text;

  console.log("Found label:", label); // Log the found label

  if (label && replacements) {
    Object.keys(replacements).forEach((key) => {
      label = label?.replaceAll(key, replacements[key]);
    });
  }

  const result = label || `Missing translation: ${_key}`;
  console.log("Final label:", result); // Log the final result

  return result;
}

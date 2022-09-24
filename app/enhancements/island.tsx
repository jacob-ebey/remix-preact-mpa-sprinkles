import { type ComponentChildren, toChildArray } from "preact";
import { useId } from "preact/hooks";
import { dependencies } from "../../package.json";

const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
const preactVersion = dependencies.preact.replace(/^[\^~]/, "");

export default function Island({
  source,
  children,
}: {
  source: string;
  children: ComponentChildren;
}) {
  let id = useId();
  let childArray = toChildArray(children);
  let childProps: unknown;

  if (childArray.length !== 1) {
    throw new Error(
      `Island expects exactly one child, but received ${childArray.length}`
    );
  }
  let child = childArray[0];
  if (typeof child === "object" && child !== null) {
    let { children, ...props } = child.props;
    childProps = props;
  }

  let serialziedProps = childProps ? JSON.stringify(childProps) : "(void 0)";

  let islandScriptParams = new URLSearchParams({ source });
  sha && islandScriptParams.set("sha", sha);

  let scriptContent = `import{h,hydrate}from"https://esm.sh/preact@${preactVersion}";`;
  scriptContent += `import Island from "/_script?${islandScriptParams}";`;
  scriptContent += `let e=document.getElementById(${JSON.stringify(
    id
  )}).previousElementSibling;`;
  scriptContent += `let a=(n)=>e.replaceChild(n,e);`;
  scriptContent += `let p=${serialziedProps};`;
  scriptContent += `hydrate(h(Island, p), {`;
  scriptContent += `childNodes:[e],`;
  scriptContent += `firstChild:e,`;
  scriptContent += `insertBefore:a,`;
  scriptContent += `appendChild:a`;
  scriptContent += `});`;

  return (
    <>
      {child}
      <script
        id={id}
        async
        type="module"
        dangerouslySetInnerHTML={{
          __html: scriptContent,
        }}
      />
    </>
  );
}

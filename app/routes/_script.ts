import { type LoaderArgs } from "@remix-run/node";
import * as path from "path";
import * as esbuild from "esbuild";
import { dependencies } from "../../package.json";

const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
const preactVersion = dependencies.preact.replace(/^[\^~]/, "");

const allowedDirsToBundle = [path.resolve(process.cwd(), "app/islands")];

const cache: Record<string, Uint8Array> = {};

export async function loader({ request }: LoaderArgs) {
  let url = new URL(request.url);
  let source = url.searchParams.get("source")!;

  if (!source) {
    return new Response("No source provided", { status: 400 });
  }
  try {
    source = path.resolve(process.cwd(), source);
  } catch {
    return new Response("Invalid source", { status: 400 });
  }

  if (cache[source]) {
    return new Response(cache[source], {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": sha
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      },
    });
  }

  if (
    !allowedDirsToBundle.some(
      (dir) => !path.relative(dir, source).startsWith(".")
    )
  ) {
    return new Response("Source not allowed", { status: 400 });
  }

  let build = await esbuild.build({
    entryPoints: { source },
    write: false,
    bundle: true,
    minify: true,
    format: "esm",
    platform: "browser",
    plugins: [
      {
        name: "esm.sh",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (
              args.path.startsWith(".") ||
              args.path.startsWith("~") ||
              path.isAbsolute(args.path)
            ) {
              return undefined;
            }

            let splitPackage = args.path.split("/");
            let packageName = splitPackage[0];
            let packageRest = splitPackage.slice(1).join("/");
            if (packageName.startsWith("@")) {
              packageName = splitPackage.slice(0, 2).join("/");
              packageRest = splitPackage.slice(2).join("/");
            }
            let packageVersion =
              dependencies[packageName as keyof typeof dependencies];
            packageVersion = packageVersion.replace(/^[\^~]/, "");
            packageRest = packageRest ? `/${packageRest}` : "";

            let postfix =
              packageName !== "preact"
                ? `?alias=react:preact/compat&deps=preact@${preactVersion}`
                : "";

            return {
              path: `https://esm.sh/${packageName}@${packageVersion}${packageRest}${postfix}`,
              external: true,
            };
          });
        },
      },
      {
        name: "on-demand-alias",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.path === source) {
              return undefined;
            }

            if (
              !args.path.startsWith(".") &&
              !args.path.startsWith("~") &&
              path.isAbsolute(args.path)
            ) {
              return {
                errors: [
                  {
                    text: `Cannot resolve "${args.path}"`,
                    detail: `You can only import relative paths or bare modules defined in your package.json.`,
                  },
                ],
              };
            }

            let resolveDir = args.resolveDir;
            let resolvePath = args.path;
            if (resolvePath.startsWith("~")) {
              resolvePath = resolvePath.slice(2);
              resolveDir = path.resolve(process.cwd(), "app");
            }

            let resolvedPath = path.resolve(resolveDir, resolvePath);

            let relativePath = path.relative(process.cwd(), resolvedPath);

            return {
              path: `/_script?source=${relativePath}${
                sha ? `&sha=${sha}` : ""
              }`,
              external: true,
            };
          });
        },
      },
    ],
  });

  let builtFile = build.outputFiles.find((file) => file.path === "<stdout>");

  if (!builtFile) {
    if (build.errors.length) {
      console.error(
        await esbuild.formatMessages(build.errors, { kind: "error" })
      );
    }
    return new Response("No output file", { status: 500 });
  }

  cache[source] = builtFile.contents;

  return new Response(builtFile.contents, {
    headers: {
      "Content-Type": "text/javascript",
      "Cache-Control": sha ? "public, max-age=31536000, immutable" : "no-cache",
    },
  });
}

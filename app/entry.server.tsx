import type { EntryContext } from "@remix-run/node";
import { Response } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import renderToString from "preact-render-to-string";

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  const html = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );
  const headers = new Headers(responseHeaders);
  headers.set("content-type", "text/html");

  return new Response("<!DOCTYPE html>" + html, {
    status: responseStatusCode,
    headers,
  });
}

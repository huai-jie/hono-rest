import { Hono } from "npm:hono";
import "https://deno.land/std@0.219.0/dotenv/load.ts";

Deno.env.get("DENO_KV_ACCESS_TOKEN");

const args = Deno.args;
let _mode = "prod";

// Search for an argument that starts with "--mode="
const modeArg = args.find((arg) => arg.startsWith("--mode="));
if (modeArg) {
  // Extract the environment value from the argument
  _mode = modeArg.split("=")?.[1];
}

const app = new Hono();
const kv = _mode == "prod" ? await Deno.openKv() : await Deno.openKv(
  "https://api.deno.com/databases/156ec23d-bf86-493c-95e5-3fd1ea2fae8d/connect",
);

// Redirect root URL
app.get("/", (c) => c.redirect("/books"));

// List all books
app.get("/books", async (c) => {
  const iter = await kv.list({ prefix: ["books"] });
  const books = [];
  for await (const res of iter) books.push(res);

  return c.json(books);
});

// Create a book (POST body is JSON)
app.post("/books", async (c) => {
  const body = await c.req.json();
  const result = await kv.set(["books", body.title], body);
  return c.json(result);
});

// Get a book by title
app.get("/books/:title", async (c) => {
  const title = c.req.param("title");
  const result = await kv.get(["books", title]);
  return c.json(result);
});

// Delete a book by title
app.delete("/books/:title", async (c) => {
  const title = c.req.param("title");
  await kv.delete(["books", title]);
  return c.text("");
});

app.put("/books/:title", async (c) => {
  const title = c.req.param("title");
  const result = await kv.set(["books", title], await c.req.json());
  return c.json(result);
});

const port = 3030;
Deno.serve({ port }, app.fetch);

import assert from "node:assert";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import z from "zod";
import { JsonStore } from "./JsonStore.js";
import { getProjectRoot } from "./utils/getProjectRoot.js";

describe("JsonStore", () => {
  let testDir: string;
  let testPath: string;
  let idCounter = 0;

  beforeEach(() => {
    // Create a unique temporary directory for each test
    testDir = join(tmpdir(), `json-store-test-${idCounter++}`);
    mkdirSync(testDir, { recursive: true });
    testPath = testDir;
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("constructor", () => {
    it("creates a JsonStore with default options", () => {
      const store = new JsonStore();

      assert.strictEqual(store.path, join(getProjectRoot(), "store.json"));
      assert.deepStrictEqual(store.defaults, {});
      assert.ok(store.schema);
    });

    it("creates a JsonStore with custom path and name", () => {
      const store = new JsonStore({
        path: testPath,
        name: "custom",
      });

      assert.strictEqual(store.path, join(testPath, "custom.json"));
    });

    it("doesn't append '.json' if already present", () => {
      const store = new JsonStore({
        path: testPath,
        name: "custom.json",
      });

      assert.strictEqual(store.path, join(testPath, "custom.json"));
    });

    it("creates a JsonStore with schema and defaults", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const defaults = { name: "John", age: 30 };
      const store = new JsonStore({
        path: testPath,
        schema,
        defaults,
      });

      assert.deepStrictEqual(store.defaults, defaults);
      assert.strictEqual(store.schema, schema);
    });
  });

  describe("read", () => {
    it("returns defaults when the file doesn't exist", () => {
      const defaults = { name: "John", age: 30 };
      const store = new JsonStore({
        path: testPath,
        defaults,
      });

      const result = store.read();
      assert.deepStrictEqual(result, defaults);
    });

    it("reads existing files", () => {
      const data = { name: "Jane", age: 25 };
      const filePath = join(testPath, "store.json");

      mkdirSync(testPath, { recursive: true });
      writeFileSync(filePath, JSON.stringify(data));

      const store = new JsonStore({
        path: testPath,
      });

      const result = store.read();
      assert.deepStrictEqual(result, data);
    });

    it("resets to defaults and creates a backup when the file is corrupted", () => {
      const defaults = { name: "John", age: 30 };
      const filePath = join(testPath, "store.json");
      const invalidJson = "{ invalid json }";

      mkdirSync(testPath, { recursive: true });
      writeFileSync(filePath, invalidJson);

      const store = new JsonStore({
        path: testPath,
        defaults,
      });

      const result = store.read();
      assert.deepStrictEqual(result, defaults);
      assert.ok(existsSync(`${filePath}.bak`));
    });

    it("resets to defaults and creates a backup when the file doesn't match the schema", () => {
      const defaults = { name: "John", age: 30 };
      const filePath = join(testPath, "store.json");
      const invalidData = JSON.stringify({ name: "Jane", age: "not a number" });

      mkdirSync(testPath, { recursive: true });
      writeFileSync(filePath, invalidData);

      const store = new JsonStore({
        path: testPath,
        schema: z.object({
          name: z.string(),
          age: z.number(),
        }),
        defaults,
      });

      const result = store.read();
      assert.deepStrictEqual(result, defaults);
      assert.ok(existsSync(`${filePath}.bak`));
    });
  });

  describe("set", () => {
    it("sets a single key-value pair", () => {
      const store = new JsonStore({
        path: testPath,
        defaults: { name: "", age: 0 },
      });

      store.set("name", "John");
      const result = store.read();
      assert.strictEqual(result.name, "John");
    });

    it("sets multiple key-value pairs", () => {
      const store = new JsonStore({
        path: testPath,
        defaults: { name: "", age: 0, city: "" },
      });

      store.set({ name: "John", age: 30 });
      const result = store.read();
      assert.strictEqual(result.name, "John");
      assert.strictEqual(result.age, 30);
      assert.strictEqual(result.city, "");
    });

    it("throws a TypeError for non-serializable values", () => {
      const store = new JsonStore({
        path: testPath,
      });

      assert.throws(() => {
        store.set("undef", undefined);
      }, TypeError);
      assert.throws(() => {
        store.set("func", () => {});
      }, TypeError);
      assert.throws(() => {
        store.set("sym", Symbol("test"));
      }, TypeError);
      assert.throws(() => {
        store.set("bigint", 123n);
      }, TypeError);

      assert.throws(() => {
        store.set({ func: () => {} });
      }, TypeError);
      assert.throws(() => {
        store.set({ undef: undefined });
      }, TypeError);
      assert.throws(() => {
        store.set({ sym: Symbol("test") });
      }, TypeError);
      assert.throws(() => {
        store.set({ bigint: 123n });
      }, TypeError);
    });

    it("creates directories if they don't exist", () => {
      const deepPath = join(testPath, "nested", "deep", "path");
      const store = new JsonStore({
        path: deepPath,
        defaults: { test: true },
      });

      store.set("test", false);
      assert.ok(existsSync(join(deepPath, "store.json")));
    });
  });

  describe("get", () => {
    it("gets a single value by key", () => {
      const store = new JsonStore({
        path: testPath,
        defaults: { name: "John", age: 30 },
      });

      const name = store.get("name");
      assert.strictEqual(name, "John");
    });

    it("gets multiple values by keys", () => {
      const store = new JsonStore({
        path: testPath,
        defaults: { name: "John", age: 30, city: "NYC" },
      });

      const result = store.get("name", "age");
      assert.deepStrictEqual(result, { name: "John", age: 30 });
    });
  });

  describe("has", () => {
    it("returns true if all keys exist", () => {
      const store = new JsonStore({
        path: testPath,
        defaults: { name: "John", age: 30 },
      });

      assert.strictEqual(store.has("name", "age"), true);
    });

    it("returns false if any key doesn't exist", () => {
      const store = new JsonStore({
        path: testPath,
        defaults: { name: "John" },
      });

      assert.strictEqual(store.has("name", "age"), false);
    });
  });

  describe("delete", () => {
    it("deletes existing keys", () => {
      const store = new JsonStore({
        path: testPath,
        defaults: { name: "John", age: 30, city: "NYC" },
      });

      store.delete("age", "city");
      assert.strictEqual(store.has("age"), false);
      assert.strictEqual(store.has("city"), false);
      assert.strictEqual(store.has("name"), true);
    });
  });

  describe("reset", () => {
    it("resets the store to defaults", () => {
      const defaults = { name: "Default", age: 0 };
      const store = new JsonStore({
        path: testPath,
        defaults,
      });

      store.set("name", "John");
      store.set("age", 30);

      const resetResult = store.reset();
      assert.deepStrictEqual(resetResult, defaults);

      const data = store.read();
      assert.deepStrictEqual(data, defaults);
    });
  });

  describe("rm", () => {
    it("removes the file", () => {
      const store = new JsonStore({
        path: testPath,
        defaults: { test: true },
      });

      // Create the file first
      store.set("test", false);
      assert.ok(existsSync(store.path));

      // Remove it
      store.rm();
      assert.ok(!existsSync(store.path));
    });

    it("doesn't throw if file doesn't exist", () => {
      const store = new JsonStore({
        path: testPath,
      });

      assert.doesNotThrow(() => {
        store.rm();
      });
    });
  });

  describe("schema validation", () => {
    it("enforces schema validation on set", () => {
      const store = new JsonStore({
        path: testPath,
        schema: z.object({
          name: z.string(),
          age: z.number(),
        }),
        defaults: { name: "John", age: 30 },
      });

      assert.throws(() => {
        store.set("age", "not a number" as any);
      });
    });

    it("handles loose schema validation", () => {
      const store = new JsonStore({
        path: testPath,
        schema: z.object({ name: z.string() }).loose(),
        defaults: { name: "John" },
      });

      store.set("extraField" as any, "extra value");
      const result = store.read();
      assert.strictEqual(result.name, "John");
      assert.strictEqual(result.extraField, "extra value");
    });
  });
});

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod/v4";
import type { OptionalValueKey } from "./utils/types";

/**
 * Options for the  creating a new {@linkcode JsonStore} instance.
 */
export type JsonFileOptions<T extends z.ZodObject> = {
  /**
   * The name to use for the file. The name will be appended with `.json`
   * if it doesn't already end with it.
   * @default 'store.json'
   */
  name?: string;

  /**
   * The path where the json will be saved; *excluding the filename*. Default
   * to the project root, determined by the presence of a `package.json` file.
   */
  path: string;

  /**
   * A [Zod](https://zod.dev) schema to validate the json against.
   */
  schema?: T;
} & ({} extends z.infer<T> ? DefaultsOption<T> : Required<DefaultsOption<T>>);

type DefaultsOption<T extends z.ZodObject> = {
  /**
   * The default values the json will be created with and will reset to
   */
  defaults?: z.infer<T>;
};

/**
 * A JSON file for persisting json data.
 */
export class JsonStore<T extends z.ZodObject> {
  /**
   * The path to the json file *including the filename*.
   */
  readonly path: string;

  /**
   * The default values the json will be created with and will reset to.
   */
  readonly defaults: JsonFileOptions<T>["defaults"];

  /**
   * The schema to validate the json against.
   */
  readonly schema: T;

  constructor({
    name = "store.json",
    path,
    defaults = {} as z.infer<T>,
    schema = z.object({}).loose() as T,
  }: JsonFileOptions<T>) {
    if (!name.endsWith(".json")) name += ".json";
    this.path = resolve(process.cwd(), path, name);
    this.schema = schema;
    this.defaults = defaults;
  }

  /**
   * Read the json file and get the values as an object.
   */
  read(): z.infer<T> {
    type Data = z.infer<T>;
    let json: string;

    try {
      json = readFileSync(this.path, "utf8");
    } catch (_) {
      this.reset();
      return this.defaults as Data;
    }

    try {
      return this.#parse(JSON.parse(json)) as Data;
    } catch (_) {
      const backupPath = `${this.path}.bak`;
      writeFileSync(backupPath, json);
      this.reset();
      console.error(
        `Failed to parse json from ${this.path}. The file has been backed up at ${backupPath} and a new json file has been created with the default values.`,
      );
      return this.defaults as Data;
    }
  }

  /**
   * Delete the json file.
   */
  rm(): void {
    try {
      rmSync(this.path);
    } catch (_) {}
  }

  /**
   * Set the value for a key or multiple keys in the json.
   * @param key - The key to set or an object of key-value pairs to set.
   * @param value - The value to set the key to if `key` is not an object.
   */
  set(values: Partial<z.infer<T>>): void;
  set<K extends keyof z.infer<T>>(key: K, value: z.infer<T>[K]): void;
  set<K extends keyof z.infer<T>>(
    keyOrValues: K | Partial<z.infer<T>>,
    value?: z.infer<T>[K],
  ): void {
    const data = this.read();

    if (typeof keyOrValues !== "object" && value) {
      validateSerializable(keyOrValues.toString(), value);
      data[keyOrValues] = value;
    } else {
      for (const [key, value] of Object.entries(keyOrValues)) {
        validateSerializable(key as string, value);
      }
      Object.assign(data, keyOrValues);
    }
    this.#save(data);
  }

  /**
   * Get a value from the json by key.
   * @param key - The key to get the value for.
   * @returns The value of `store[key]`.
   */
  get<K extends keyof z.infer<T>>(key: K): z.infer<T>[K];
  get<K extends keyof z.infer<T>>(...keys: K[]): Pick<z.infer<T>, K>;
  get<K extends keyof z.infer<T>>(key: K, ...restKeys: K[]) {
    const data = this.read();
    return restKeys.length === 0
      ? data[key]
      : Object.fromEntries([
          [key, data[key]],
          ...Object.entries(data).filter(([k]) => restKeys.includes(k as any)),
        ]);
  }

  /**
   * Check to see if the json contains all given keys.
   * @param keys - The keys to look for.
   * @returns True if all keys exists, false otherwise.
   */
  has<T extends string>(...keys: T[]): boolean {
    const data = this.read();

    let hasAllKeys = true;

    for (const key of keys) {
      if (!(key in data)) {
        hasAllKeys = false;
      }
    }

    return hasAllKeys;
  }

  /**
   * Delete entries in the json by their keys.
   * @param keys - The keys of the entries to delete.
   * @returns True if all entries were deleted, false otherwise.
   */
  delete(...keys: OptionalValueKey<z.infer<T>>[]): boolean {
    const data = this.read();

    let didDeleteSome = false;
    let didDeleteAll = true;

    for (const key of keys) {
      if ((key as string) in data) {
        delete data[key];
        didDeleteSome = true;
      } else {
        didDeleteAll = false;
      }
    }

    if (didDeleteSome) {
      this.#save(data);
    }

    return didDeleteAll;
  }

  /**
   * Reset json to defaults.
   */
  reset() {
    this.#save(this.defaults as z.infer<T>);
    return this.defaults;
  }

  /**
   * Throw an error if the data doesn't match the schema.
   * @param data - The data to validate against the schema.
   */
  #parse(data: unknown): z.infer<T> | undefined {
    const parsed = this.schema.safeParse(data);
    if (parsed.error) {
      throw new Error(
        `Failed to save json. Data does not match schema: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  /**
   * Save the data as json.
   * @param data - The json data.
   */
  #save(data: z.infer<T>) {
    data = this.#parse(data) as z.infer<T>;
    const json = JSON.stringify(data, null, 2);

    mkdirSync(dirname(this.path), { recursive: true });

    writeFileSync(this.path, json, {
      encoding: "utf8",
      flag: "w",
    });
  }
}

const invalidTypes = ["undefined", "function", "symbol", "bigint"];

/**
 * Throw an error if a value is not JSON serializable
 * @param key - The key being set (used to provide more context in the error)
 * @param value - The value to validate
 */
function validateSerializable(key: string, value: unknown) {
  if (value === null || invalidTypes.includes(typeof value)) {
    throw new TypeError(
      `Failed to set value of type \`${typeof value}\` for key \`${key}\`. Values must be JSON serializable.`,
    );
  }
}

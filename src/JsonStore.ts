import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod/v4";
import { getProjectRoot } from "./utils/getProjectRoot";
import type { OptionalValueKey } from "./utils/types";

/**
 * Options for the  creating a new {@linkcode JsonStore} instance.
 */
export type JsonFileOptions<T extends z.ZodObject> = {
  /**
   * The name to use for the file. The name will be appended with `.json`
   * if it doesn't already end with it.
   *
   * @default "store.json"
   */
  name?: string;

  /**
   * The path where the json will be saved, *excluding the filename*. Default
   * to the project root, determined by the presence of a `package.json` file.
   *
   * @default
   * getProjectRoot()
   *
   * @see {@linkcode getProjectRoot}
   */
  path?: string;

  /**
   * A [Zod](https://zod.dev) schema to validate the data against.
   */
  schema?: T;
} & ({} extends z.infer<T> ? DefaultsOption<T> : Required<DefaultsOption<T>>);

type DefaultsOption<T extends z.ZodObject> = {
  /**
   * The default values the data will be created with and will reset to.
   */
  defaults?: z.infer<T>;
};

/**
 * A simple store for persisting JSON data in a file.
 *
 * Data is always read directly from the file to ensure it is up-to-date.
 */
export class JsonStore<T extends z.ZodObject> {
  /**
   * The path to the file, *including the filename*.
   */
  readonly path: string;

  /**
   * The default values the file will be created with and will reset to.
   */
  readonly defaults: JsonFileOptions<T>["defaults"];

  /**
   * The schema used to validate the data.
   */
  readonly schema: T;

  constructor(
    {
      name = "store.json",
      path = getProjectRoot(),
      defaults = {} as z.infer<T>,
      schema = z.object({}).loose() as T,
    } = {} as JsonFileOptions<T>,
  ) {
    if (!name.endsWith(".json")) name += ".json";
    this.path = resolve(process.cwd(), path, name);
    this.schema = schema;
    this.defaults = defaults;
  }

  /**
   * Read the file and get the values as an object.
   */
  read(): z.infer<T> {
    type Data = z.infer<T>;
    let json: string;

    try {
      json = readFileSync(this.path, "utf8");
    } catch (_) {
      return this.reset() as Data;
    }

    try {
      return this.#parse(JSON.parse(json)) as Data;
    } catch (_) {
      const backupPath = `${this.path}.bak`;
      writeFileSync(backupPath, json);
      const data = this.reset();
      console.error(
        `Failed to parse json from ${this.path}. The file has been backed up at ${backupPath} and a new json file has been created with the default values.`,
      );
      return data as Data;
    }
  }

  /**
   * Delete the file.
   */
  rm(): void {
    if (existsSync(this.path)) {
      rmSync(this.path);
    }
  }

  /**
   * Set the value for a key or multiple keys.
   *
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
    if (typeof keyOrValues !== "object") {
      validateSerializable(keyOrValues.toString(), value);
      data[keyOrValues] = value as z.infer<T>[K];
    } else {
      for (const [key, value] of Object.entries(keyOrValues)) {
        validateSerializable(key as string, value);
      }
      Object.assign(data, keyOrValues);
    }
    this.#save(data);
  }

  /**
   * Get a value or multiple values by key(s).
   *
   * @param key - The key to get the value for.
   * @param restKeys - Additional keys to get values for.
   * @returns The value for the key, or an object with the values for all keys
   * if multiple keys are provided.
   */
  get<K extends keyof z.infer<T>>(key: K): z.infer<T>[K];
  get<K extends keyof z.infer<T>>(...keys: K[]): Pick<z.infer<T>, K>;
  get<K extends keyof z.infer<T>>(key: K, ...restKeys: K[]) {
    const data = this.read();
    if (!restKeys.length) return data[key];
    const selected = {
      [key]: data[key],
    } as Pick<z.infer<T>, K>;
    for (const key of restKeys) {
      selected[key] = data[key];
    }
    return selected;
  }

  /**
   * Check to see if the store contains all given keys.
   *
   * @param keys - The keys to look for.
   * @returns True if all keys are present, false otherwise.
   */
  has<T extends string>(...keys: T[]): boolean {
    const data = this.read();
    return keys.every((key) => key in data);
  }

  /**
   * Delete entries by their keys.
   *
   * @param keys - The keys of the entries to delete.
   */
  delete(...keys: OptionalValueKey<z.infer<T>>[]): void {
    const data = this.read();
    const newData = {} as z.infer<T>;
    let didDeleteSome = false;
    for (const _key of Object.keys(data)) {
      const key = _key as OptionalValueKey<z.infer<T>>;
      if (!keys.includes(key)) {
        newData[key] = data[key];
      } else {
        didDeleteSome = true;
      }
    }
    if (didDeleteSome) {
      this.#save(newData);
    }
  }

  /**
   * Reset the file to defaults.
   */
  reset() {
    this.#save(this.defaults || ({} as z.infer<T>));
    return this.defaults;
  }

  /**
   * Throw an error if the data doesn't match the schema.
   *
   * @param data - The data to validate against the schema.
   */
  #parse(data: unknown): z.infer<T> {
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
   *
   * @param data - The json data.
   */
  #save(data: z.infer<T>) {
    const parsed = this.#parse(data);
    const json = JSON.stringify(parsed, null, 2);
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
  if (invalidTypes.includes(typeof value)) {
    throw new TypeError(
      `Failed to set value of type \`${typeof value}\` for key \`${key}\`. Values must be JSON serializable.`,
    );
  }
  return true;
}

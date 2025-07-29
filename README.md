# Gud JSON Store

[![GitHub](https://img.shields.io/badge/ryangoree%2Fgud--json--store-151b23?logo=github)](https://github.com/ryangoree/gud-json-store)
[![NPM
Version](https://img.shields.io/badge/%40gud%2Fjson--store-cb3837?logo=npm)](https://npmjs.com/package/@gud/json-store)
[![License:
Apache-2.0](https://img.shields.io/badge/Apache%202.0-23454d?logo=apache)](./LICENSE)

**A TypeScript-first JSON key-value store with Zod schema validation.**

## ✨ Features

- **Type-safe** - Full TypeScript support with Zod schema validation
- **File-based persistence** - Automatically saves data to JSON files
- **Schema validation** - Ensure data integrity with Zod schemas
- **Always up-to-date** - Reads directly from file to ensure fresh data
- **Auto-recovery** - Backs up corrupted files and resets to defaults
- **Simple API** - Intuitive get/set interface with key-value operations
- **Zero dependencies** - Only requires Zod as a peer dependency
- **Project-aware** - Automatically detects project root for default storage

## Installing

```sh
npm install @gud/json-store zod
```

## Quick Start

```typescript
import { JsonStore } from '@gud/json-store';
import { z } from 'zod';

// Create a simple store
const store = new JsonStore();

// Set some values
store.set('name', 'John Doe');
store.set('age', 30);

// Get values
const name = store.get('name'); // "John Doe"
const data = store.get('name', 'age'); // { name: "John Doe", age: 30 }

// With schema validation
const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email().optional(),
});

const userStore = new JsonStore({
  name: 'users',
  schema: userSchema,
  defaults: {
    name: '',
    age: 0,
  },
});

userStore.set('email', 'john@example.com');
```

## API Reference

### `JsonStore` Class

#### Properties

- `path: string` - Full path to the JSON file
- `schema: z.ZodObject` - The Zod schema used for validation
- `defaults: TData` - Default values for the store

#### Methods

##### `read(): TData`
Read and return all data from the store.

##### `set(key, value)` / `set(values)`
Set a single key-value pair or multiple values at once.

```typescript
store.set('key', 'value');
store.set({ key1: 'value1', key2: 'value2' });
```

##### `get(key)` / `get(...keys)`
Get a single value or multiple values by key(s).

```typescript
const value = store.get('key');
const values = store.get('key1', 'key2'); // Returns object
```

##### `has(...keys): boolean`
Check if all specified keys exist in the store.

```typescript
if (store.has('name', 'email')) {
  // Both keys exist
}
```

##### `delete(...keys): void`
Delete one or more keys from the store.

```typescript
store.delete('key1', 'key2');
```

##### `reset(): TData`
Reset the store to its default values.

##### `rm(): void`
Delete the JSON file from disk.

### `getProjectRoot()` Util

Get the path to the nearest app root directory, determined by the presence of a
`package.json` file.

```typescript
import { getProjectRoot } from '@gud/json-store';
import { join } from 'node:path';

const rootPath = getProjectRoot();
const packageJsonPath = join(rootPath, 'package.json');
console.log(`package.json path: ${packageJsonPath}`);
```

### `getOSConfigDir()` Util

Get the path to an app specific config directory based on operating system
standards.

```typescript
import { getOSConfigDir } from '@gud/json-store';

const configDir = getOSConfigDir('app-name');
console.log(`Config directory: ${configDir}`);
// e.g. ~/Library/Application Support/app-name on macOS
```

## Error Handling

JsonStore automatically handles common errors:

- **Corrupted JSON**: Creates a backup and resets to defaults
- **Invalid schema**: Throws validation errors with detailed messages
- **Missing directories**: Automatically creates parent directories
- **Non-serializable values**: Throws TypeError for functions, symbols, etc.

## License

Apache-2.0
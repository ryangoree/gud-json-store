# Gud Logger

[![GitHub](https://img.shields.io/badge/ryangoree%2Fgud--logger-151b23?logo=github)](https://github.com/ryangoree/gud-logger)
[![NPM Version](https://img.shields.io/badge/%40gud%2Flogger-cb3837?logo=npm)](https://npmjs.com/package/@gud/logger)
[![License: Apache-2.0](https://img.shields.io/badge/Apache%202.0-23454d?logo=apache)](./LICENSE)

**An opinionated and flexible logger for TS/JS projects.**

## ✨ Features

- 🚀 **Zero-config benchmarking** - Just point it at your functions
- 📊 **Statistical accuracy** with multiple cycles and margin of error calculation
- 🔧 **TypeScript support** - Transpiles `.ts` files on-the-fly
- ⚡ **Multiple export patterns** - Detects default, named, and benchmark exports
- 🗑️ **Memory management** - Advanced garbage collection strategies
- 📈 **Export results** - JSON output for further analysis
- 📦 **Library + CLI** - Use programmatically or via command line

## Installing

```sh
npm install --global @gud/logger

# or, for local projects
npm install --save-dev @gud/logger
```

## Usage



## API Reference

### `benchmark(name?: string)`

Creates a new benchmark suite.

**Parameters:**
- `name` (optional) - Name for the benchmark suite

**Returns:** `Benchmark` instance

### `Benchmark` Class

#### Methods

- `test(name: string, fn: Function)` - Add a test function
- `run(iterations: number, options?: RunOptions)` - Execute benchmark
- `preheat(iterations: number, options?)` - Warm up before benchmarking  
- `exportToJson(filePath: string)` - Export results to JSON
- `printResults()` - Display formatted results table

#### `RunOptions`

```ts
interface RunOptions {
  cycles?: number;           // Test cycles (default: 1)
  coolDown?: number;         // MS between runs
  verbosity?: 0 | 1 | 2;     // Output level (default: 1) 
  gcStrategy?: 'never' | 'per-cycle' | 'per-test' | 'periodic';
  gcInterval?: number;       // For periodic GC (default: 1000)
}
```

### Garbage Collection Strategies

- `'never'` - No forced GC (fastest, but memory pressure may affect results)
- `'per-cycle'` - GC once per cycle (good balance)
- `'per-test'` - GC after each test completes all iterations
- `'periodic'` - GC every N iterations (default, configurable via `gcInterval`)

**Note:** The CLI automatically restarts with the `--expose-gc` flag when needed for garbage collection. To disable this behavior, set the environment variable `BENCH_NO_EXPOSE_GC=true`.
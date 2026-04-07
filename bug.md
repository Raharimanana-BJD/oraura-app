p db:seed

> oraura-app@0.1.0 db:seed /home/braharim/projet/oraura-app
> prisma db seed

Loaded Prisma config from prisma.config.ts.

Running seed command `tsx prisma/seed.ts` ...
/home/braharim/projet/oraura-app/node*modules/.pnpm/@prisma+client@7.6.0_prisma@7.6.0*@types+react-dom@19.2.3_@types+react@19.2.14__@types+\_c6cce8f0688191bea189f12690ac782d/node_modules/@prisma/client/src/runtime/getPrismaClient.ts:320
throw new PrismaClientInitializationError(
^

PrismaClientInitializationError: `PrismaClient` needs to be constructed with a non-empty, valid `PrismaClientOptions`:

```
new PrismaClient({
  ...
})
```

or

```
constructor() {
  super({ ... });
}
```

    at new t (/home/braharim/projet/oraura-app/node_modules/.pnpm/@prisma+client@7.6.0_prisma@7.6.0_@types+react-dom@19.2.3_@types+react@19.2.14__@types+_c6cce8f0688191bea189f12690ac782d/node_modules/@prisma/client/src/runtime/getPrismaClient.ts:320:15)
    at <anonymous> (/home/braharim/projet/oraura-app/prisma/seed.ts:3:16)
    at ModuleJob.run (node:internal/modules/esm/module_job:430:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:661:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) {

clientVersion: '7.6.0',
errorCode: undefined,
retryable: undefined
}

Node.js v24.13.1

An error occurred while running the seed command:
Error: Command failed with exit code 1: tsx prisma/seed.ts
 ELIFECYCLE  Command failed with exit code 1.

import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodTypeAny, input, output } from "zod";

type RawResolverOptions = {
  mode?: "async" | "sync";
  raw: true;
};

type NonRawResolverOptions = {
  mode?: "async" | "sync";
  raw?: false;
};

type SchemaParams<Schema extends ZodTypeAny> = Schema extends {
  parse(data: unknown, params?: infer Params): any;
}
  ? Params
  : never;

declare module "@hookform/resolvers/zod" {
  // Widen resolver overloads to accept Zod 4 schemas compiled with newer minors.
  function zodResolver<Schema extends ZodTypeAny, Context = unknown>(
    schema: Schema,
    schemaOptions?: SchemaParams<Schema>,
    resolverOptions?: NonRawResolverOptions
  ): Resolver<input<Schema> & FieldValues, Context, output<Schema>>;

  function zodResolver<Schema extends ZodTypeAny, Context = unknown>(
    schema: Schema,
    schemaOptions: SchemaParams<Schema> | undefined,
    resolverOptions: RawResolverOptions
  ): Resolver<input<Schema> & FieldValues, Context, input<Schema>>;
}

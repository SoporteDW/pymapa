import { createServerFn } from "@tanstack/react-start";
import { entradaPilotoSchema } from "./escenarios";

/** Public sandbox: synthetic input only, no organization, database or provider. */
export const ejecutarPiloto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => entradaPilotoSchema.parse(input))
  .handler(async ({ data }) => {
    const { evaluarPiloto } = await import("./piloto.server");
    return evaluarPiloto(data);
  });
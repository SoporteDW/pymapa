import { plantillasEscenarioHero as p } from "@/lib/workspace/escenario-hero";
import { seleccionarPlantillaIndicador as s } from "@/lib/seguimiento/catalogo";
for (const a of p) console.log(a.id, "->", s({titulo:a.titulo,objetivo:a.objetivo,dominioId:a.origen.dominioId}).nombre);

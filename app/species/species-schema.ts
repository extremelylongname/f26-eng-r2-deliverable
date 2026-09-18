import { z } from "zod";

// Kingdom enum shared by the add/edit forms and the kingdom dropdown
export const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

// Transform empty or whitespace-only input to null, otherwise trim
const optionalText = z
  .string()
  .nullable()
  .transform((val) => (!val || val.trim() === "" ? null : val.trim()));

// Shape and validation rules for a species entry; used by both the add and edit forms
export const speciesSchema = z.object({
  scientific_name: z.string().trim().min(1, "Scientific name is required"),
  common_name: optionalText,
  kingdom: kingdoms,
  total_population: z
    .number({ invalid_type_error: "Enter a whole number" })
    .int("Enter a whole number")
    .positive("Must be greater than 0")
    // The column is a 4-byte Postgres integer, so anything larger is rejected here instead of by the database
    .max(2_147_483_647, "Total population is too large")
    .nullable(),
  image: optionalText.pipe(z.string().url("Must be a valid URL").nullable()),
  description: optionalText,
  endangered: z.boolean(),
});

export type SpeciesFormData = z.infer<typeof speciesSchema>;

export const emptySpeciesFormValues: SpeciesFormData = {
  scientific_name: "",
  common_name: null,
  kingdom: "Animalia",
  total_population: null,
  image: null,
  description: null,
  endangered: false,
};

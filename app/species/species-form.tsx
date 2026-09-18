"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { useEffect, type BaseSyntheticEvent } from "react";
import { useForm, type Control } from "react-hook-form";
import { kingdoms, speciesSchema, type SpeciesFormData } from "./species-schema";
import WikipediaSearch from "./wikipedia-search";

// A submit error that belongs to one field; the form shows it inline under that field
export interface SpeciesFieldError {
  field: keyof SpeciesFormData;
  message: string;
}

// A duplicate scientific name (Postgres unique violation, code 23505) becomes an inline field error; every other
// database error is reported in a toast
export function reportSpeciesError(error: PostgrestError): SpeciesFieldError | undefined {
  if (error.code === "23505") {
    return { field: "scientific_name", message: "A species with this scientific name already exists" };
  }
  toast({ title: "Something went wrong.", description: error.message, variant: "destructive" });
  return undefined;
}

// Text fields whose stored value may be null; inputs can't handle null so we render "" instead
// https://github.com/orgs/react-hook-form/discussions/4091
function OptionalTextField({
  control,
  name,
  label,
  placeholder,
  multiline = false,
}: {
  control: Control<SpeciesFormData>;
  name: "common_name" | "image" | "description";
  label: string;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: { value, ...rest } }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {multiline ? (
              <Textarea value={value ?? ""} placeholder={placeholder} {...rest} />
            ) : (
              <Input value={value ?? ""} placeholder={placeholder} {...rest} />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default function SpeciesForm({
  defaultValues,
  onSubmit,
  submitLabel,
  wikipediaAutofill = false,
}: {
  defaultValues: SpeciesFormData;
  onSubmit: (data: SpeciesFormData) => Promise<SpeciesFieldError | undefined>;
  submitLabel: string;
  wikipediaAutofill?: boolean;
}) {
  const form = useForm<SpeciesFormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues,
    mode: "onChange",
  });

  // Show the stored values again whenever they change (e.g. an edit dialog reopened after Cancel, or after a refresh)
  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const submit = async (data: SpeciesFormData) => {
    const fieldError = await onSubmit(data);
    if (fieldError) form.setError(fieldError.field, { message: fieldError.message });
  };

  return (
    <Form {...form}>
      {/* noValidate: zod is the single source of validation messages, so the browser's own bubbles are turned off */}
      <form noValidate onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(submit)(e)}>
        <div className="grid w-full items-center gap-4">
          {wikipediaAutofill && (
            <WikipediaSearch
              onResult={({ description, image }) => {
                form.setValue("description", description, { shouldValidate: true, shouldDirty: true });
                // Keep a manually entered image URL when the article has no thumbnail
                if (image) form.setValue("image", image, { shouldValidate: true, shouldDirty: true });
              }}
            />
          )}
          <FormField
            control={form.control}
            name="scientific_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scientific Name</FormLabel>
                <FormControl>
                  <Input placeholder="Cavia porcellus" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <OptionalTextField control={form.control} name="common_name" label="Common Name" placeholder="Guinea pig" />
          <FormField
            control={form.control}
            name="kingdom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kingdom</FormLabel>
                <Select onValueChange={(value) => field.onChange(kingdoms.parse(value))} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a kingdom" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectGroup>
                      {kingdoms.options.map((kingdom) => (
                        <SelectItem key={kingdom} value={kingdom}>
                          {kingdom}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="total_population"
            render={({ field: { value, ...rest } }) => (
              <FormItem>
                <FormLabel>Total population</FormLabel>
                <FormControl>
                  {/* Using shadcn/ui form with number: https://github.com/shadcn-ui/ui/issues/421 */}
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={value ?? ""}
                    placeholder="300000"
                    {...rest}
                    onChange={(event) => rest.onChange(event.target.value === "" ? null : Number(event.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <OptionalTextField
            control={form.control}
            name="image"
            label="Image URL"
            placeholder="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/George_the_amazing_guinea_pig.jpg/440px-George_the_amazing_guinea_pig.jpg"
          />
          <OptionalTextField
            control={form.control}
            name="description"
            label="Description"
            placeholder="The guinea pig or domestic guinea pig, also known as the cavy or domestic cavy, is a species of rodent belonging to the genus Cavia in the family Caviidae."
            multiline
          />
          <FormField
            control={form.control}
            name="endangered"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>This species is endangered</FormLabel>
                  <FormDescription>
                    Endangered species are flagged on their card and in the detailed view.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          <div className="flex">
            <Button type="submit" className="ml-1 mr-1 flex-auto" disabled={form.formState.isSubmitting}>
              {submitLabel}
            </Button>
            <DialogClose asChild>
              <Button type="button" className="ml-1 mr-1 flex-auto" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
          </div>
        </div>
      </form>
    </Form>
  );
}

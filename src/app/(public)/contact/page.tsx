"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { inquirySchema, type InquiryFormValues } from "./schema";
import { submitInquiry } from "./actions";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      event_type: "",
      event_date: "",
      message: "",
    },
  });

  async function onSubmit(values: InquiryFormValues) {
    setServerError(null);
    const result = await submitInquiry(values);
    if (result.ok) {
      setSubmitted(true);
      reset();
    } else {
      setServerError(result.error);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Get in touch
      </h1>
      <p className="mb-8 text-sm text-zinc-500">
        Tell us about your event and we&apos;ll get back to you shortly.
      </p>

      {submitted ? (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
          Thanks! Your inquiry has been sent. We&apos;ll be in touch soon.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <Input {...register("name")} placeholder="Jane Doe" />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <Input type="email" {...register("email")} placeholder="jane@example.com" />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Phone (optional)
            </label>
            <Input {...register("phone")} placeholder="(555) 555-5555" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Event type
              </label>
              <Input {...register("event_type")} placeholder="Wedding" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Event date
              </label>
              <Input type="date" {...register("event_date")} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Message
            </label>
            <Textarea rows={5} {...register("message")} placeholder="Tell us more..." />
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Sending..." : "Send inquiry"}
          </Button>
        </form>
      )}
    </div>
  );
}

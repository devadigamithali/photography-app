import { ContactForm } from "./ContactForm";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Get in touch
      </h1>
      <p className="mb-8 text-sm text-zinc-500">
        Tell us about your event and we&apos;ll get back to you shortly.
      </p>
      <ContactForm />
    </div>
  );
}

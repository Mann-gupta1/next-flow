import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="mb-8 text-center absolute top-12">
        <h1 className="text-2xl font-bold text-neutral-900">Nextflow</h1>
        <p className="text-sm text-neutral-500 mt-1">LLM Workflow Builder</p>
      </div>
      <SignIn
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white border border-neutral-200 shadow-xl",
            headerTitle: "text-neutral-905 font-bold",
            headerSubtitle: "text-neutral-500",
            socialButtonsBlockButton:
              "bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50 transition-colors",
            formFieldLabel: "text-neutral-600 font-semibold",
            formFieldInput:
              "bg-neutral-50 border border-neutral-200 text-neutral-800 focus:border-black",
            formButtonPrimary:
              "bg-black hover:bg-neutral-850 text-white shadow-md transition-colors",
            footerActionLink: "text-black hover:underline font-semibold",
            identityPreviewEditButton: "text-neutral-700",
          },
        }}
      />
    </div>
  );
}

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="relative">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-1000"></div>
        <div className="relative">
          <SignUp
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-gray-900/50 backdrop-blur-xl border border-gray-700 shadow-2xl",
                headerTitle: "text-white",
                headerSubtitle: "text-gray-400",
                socialButtonsBlockButton:
                  "bg-gray-800 hover:bg-gray-700 border-gray-600 text-white",
                formButtonPrimary:
                  "bg-purple-600 hover:bg-purple-700 text-white",
                formFieldInput: "bg-gray-800 border-gray-700 text-white",
                formFieldLabel: "text-gray-300",
                footerActionLink: "text-purple-400 hover:text-purple-300",
                dividerLine: "bg-gray-700",
                dividerText: "text-gray-500",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

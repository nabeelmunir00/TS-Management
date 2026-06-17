import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkles, CheckCircle, Layout, Brain } from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center space-y-8">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 bg-purple-500/20 px-4 py-2 rounded-full border border-purple-500/30">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm">
                AI-Powered Development
              </span>
            </div>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-white">
            Developer Hub
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              Manage Everything
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            All-in-one platform for developers to manage tasks, notes, system
            design, and get AI-powered suggestions.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/sign-up">
              <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold hover:shadow-2xl hover:shadow-purple-500/30 transition-all transform hover:scale-105 inline-flex items-center gap-2">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/sign-in">
              <button className="px-8 py-4 bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl text-white font-semibold hover:bg-gray-700/50 transition-all">
                Sign In
              </button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-6xl mx-auto">
          <div className="bg-gray-800/30 backdrop-blur border border-gray-700 rounded-2xl p-8 hover:border-purple-500/50 transition-all">
            <div className="bg-purple-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Task Management
            </h3>
            <p className="text-gray-400">
              Create, organize, and track your development tasks with ease.
            </p>
          </div>

          <div className="bg-gray-800/30 backdrop-blur border border-gray-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all">
            <div className="bg-blue-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <Layout className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              System Design
            </h3>
            <p className="text-gray-400">
              Design system architecture with interactive canvas.
            </p>
          </div>

          <div className="bg-gray-800/30 backdrop-blur border border-gray-700 rounded-2xl p-8 hover:border-green-500/50 transition-all">
            <div className="bg-green-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              AI Assistant
            </h3>
            <p className="text-gray-400">
              Get smart suggestions and automate your workflow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

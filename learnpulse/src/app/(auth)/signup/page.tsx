"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const raw = await res.text();
      let data: { error?: string };
      try {
        data = JSON.parse(raw) as { error?: string };
      } catch {
        toast.error(
          res.status >= 500
            ? "Server error — check the terminal or .env.local"
            : "Could not read server response",
        );
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? "Could not create account");
        return;
      }
      toast.success("Welcome to PridePath");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      className="app-panel rounded-2xl p-8"
    >
      <h1 className="text-center text-2xl font-semibold tracking-tight text-white">
        Create account
      </h1>
      <p className="mt-1 text-center text-sm text-zinc-400">
        Create your academic workspace in minutes
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            Username
          </label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            className="mt-1"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={2}
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className="mt-1"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? "Creating…" : "Sign up"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
          Log in
        </Link>
      </p>
    </motion.div>
  );
}

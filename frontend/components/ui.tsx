"use client";

import { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const base = "px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.className ?? ""}`}
    />
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "red" | "amber" }) {
  const tones = {
    neutral: "bg-black/10 dark:bg-white/10 text-black/70 dark:text-white/70",
    green: "bg-green-500/15 text-green-700 dark:text-green-400",
    red: "bg-red-500/15 text-red-700 dark:text-red-400",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium mb-1 text-black/60 dark:text-white/60">{children}</label>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

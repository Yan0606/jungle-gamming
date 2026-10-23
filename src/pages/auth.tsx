import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, toApiError } from "@/lib/api";
import { writeToken } from "@/lib/utils";
import { Button, Dialog, DialogContent, FieldError, Input, Label } from "@/components/ui";
import { usePageMeta } from "@/lib/meta";

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-4 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33c.71-2.12 2.69-3.7 5.03-3.7z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
      <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.27h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z" />
    </svg>
  );
}

export function AuthDialog({ mode, redirect }: { mode: "login" | "register"; redirect?: string }) {
  usePageMeta(mode === "login" ? "Entrar — Kurio" : "Criar conta — Kurio");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const mutation = useMutation({
    mutationFn: () =>
      mode === "login" ? api.login(form.email, form.password) : api.register(form),
    onSuccess: async (result) => {
      writeToken(result.token);
      await queryClient.invalidateQueries();
      const target = redirect && redirect.startsWith("/") ? redirect : "/";
      window.location.assign(target);
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setFields(apiError.fields ?? { form: apiError.message });
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) navigate({ to: redirect && redirect.startsWith("/") ? redirect : "/" });
      }}
    >
      <DialogContent title={mode === "login" ? "Entrar" : "Criar conta"} className="bg-[#1a120e]">
        <div className="mb-4 flex gap-6 text-sm tracking-[0.04em]">
          <Link to="/entrar" search={{ redirect }} className={mode === "login" ? "text-amber" : "text-muted"}>
            ENTRAR
          </Link>
          <Link to="/cadastro" search={{ redirect }} className={mode === "register" ? "text-amber" : "text-muted"}>
            CRIAR CONTA
          </Link>
        </div>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setFields({});
            mutation.mutate();
          }}
        >
          {mode === "register" ? (
            <div className="space-y-1">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Seu nome" value={form.name} aria-invalid={Boolean(fields.name)} aria-describedby={fields.name ? "name-error" : undefined} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <FieldError id="name-error">{fields.name}</FieldError>
            </div>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="Digite seu e-mail" value={form.email} aria-invalid={Boolean(fields.email)} aria-describedby={fields.email ? "email-error" : undefined} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <FieldError id="email-error">{fields.email}</FieldError>
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Digite sua senha" value={form.password} aria-invalid={Boolean(fields.password)} aria-describedby={fields.password ? "password-error" : undefined} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <FieldError id="password-error">{fields.password}</FieldError>
          </div>
          {fields.form ? <p role="alert" className="text-sm text-[#ffb4a8]">{fields.form}</p> : null}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <p className="my-4 text-center text-sm text-muted">Ou continue com</p>
        <div className="grid gap-2">
          <Button type="button" variant="outline" className="w-full" onClick={() => setFields({ form: "O login social não entra nesta simulação." })}>
            <GoogleMark />
            Continuar com Google
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => setFields({ form: "O login social não entra nesta simulação." })}>
            <FacebookMark />
            Continuar com Facebook
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ChronixERP - Clean Login & Authentication Component
 * - NENHUMA empresa é escolhida no Login (empresa é obtida da sessão do usuário).
 * - Sem auto-login.
 * - Novos cadastros possuem status PENDENTE de aprovação do Administrador.
 */

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { User } from '../types';
import { chronixLogoImg, storage, SUPERADMIN_EMAIL } from '../services/storage';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Form Fields
  const [email, setEmail] = useState(() => localStorage.getItem('aquinos_saved_email') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('aquinos_saved_password') || '');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('aquinos_remember_me') === 'true');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  React.useEffect(() => {
    storage.syncUsersFromSupabase();
  }, []);

  const isSuperadminAttempt = email.trim().toLowerCase() === SUPERADMIN_EMAIL;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setPendingNotice(null);

    if (!email.trim() || !password) {
      setErrorMessage('Preencha o e-mail/usuário e a senha para continuar.');
      return;
    }

    setIsLoggingIn(true);

    try {
      let result = storage.login(email, password);
      
      // If user not found locally or login failed, attempt to sync from Supabase and retry
      if (!result.success) {
        await storage.syncUsersFromSupabase();
        result = storage.login(email, password);
      }

      if (!result.success || !result.user) {
        setErrorMessage(result.error || 'Erro ao realizar login.');
        return;
      }

      // Handle Remember Me / Session persistence
      if (rememberMe) {
        localStorage.setItem('aquinos_remember_me', 'true');
        localStorage.setItem('aquinos_saved_email', email.trim());
        localStorage.setItem('aquinos_saved_password', password);
      } else {
        localStorage.removeItem('aquinos_remember_me');
        localStorage.removeItem('aquinos_saved_email');
        localStorage.removeItem('aquinos_saved_password');
      }
      sessionStorage.setItem('aquinos_session_active', 'true');

      // Immediate callback on login success so hitting Enter logs in right away
      onLoginSuccess(result.user);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Informe o e-mail cadastrado para redefinir a senha.');
      return;
    }

    if (!password || password.length < 3) {
      setErrorMessage('A nova senha deve ter pelo menos 3 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    const res = storage.resetUserPasswordByEmail(email, password);
    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao redefinir a senha.');
      return;
    }

    setSuccessMessage('Sua senha foi redefinida com sucesso! Você já pode entrar com a nova senha.');
    setConfirmPassword('');
    setMode('login');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setPendingNotice(null);

    if (!name.trim()) {
      setErrorMessage('Por favor, informe seu Nome Completo.');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu E-mail.');
      return;
    }

    if (!password || password.length < 3) {
      setErrorMessage('A senha deve conter pelo menos 3 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    // Register user
    const result = storage.registerUser({
      name: name.trim(),
      email: email.trim(),
      password,
      role: isSuperadminAttempt ? 'superadmin' : 'funcionario',
    });

    if (!result.success || !result.user) {
      setErrorMessage(result.error || 'Erro ao realizar cadastro.');
      return;
    }

    if (isSuperadminAttempt) {
      setSuccessMessage('Conta de Superadmin configurada com sucesso. Você já pode acessar.');
      setMode('login');
      return;
    }

    // Non-superadmin users require administrator approval
    setPendingNotice(
      'Seu cadastro foi recebido e está aguardando aprovação do administrador. Você receberá o acesso assim que for liberado.'
    );
    setName('');
    setConfirmPassword('');
    setPassword('');
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background Lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto">
        {/* Header Branding */}
        <div className="p-6 pb-5 text-center border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/90 relative">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-slate-950 border border-slate-700/80 mb-3 shadow-xl">
            <img
              src={chronixLogoImg}
              alt="Chronix ERP Logo"
              className="w-16 h-16 rounded-xl object-contain shadow-md"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Chronix ERP</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Gestão Comercial • Autenticação Unificada
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 bg-slate-950 p-1.5 gap-1 border-b border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Acessar Conta</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              mode === 'register'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Criar Nova Conta</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {pendingNotice && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs rounded-2xl flex items-start gap-3 shadow-md">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-300">Cadastro Recebido - Status Pendente</span>
                <p className="text-amber-200/90 leading-relaxed">{pendingNotice}</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs font-semibold rounded-2xl flex flex-col gap-2 shadow-md">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline self-start pl-6"
                >
                  Deseja redefinir sua senha agora?
                </button>
              )}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 text-xs font-semibold rounded-2xl flex items-start gap-2.5 shadow-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  E-mail ou Usuário
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu e-mail ou nome de usuário (ex: joao, admin)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha de acesso"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Manter conectado</span>
                </label>
                {isSuperadminAttempt && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Modo Superadmin
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              >
                <LogIn className={`w-4 h-4 ${isLoggingIn ? 'animate-spin' : ''}`} />
                <span>{isLoggingIn ? 'Verificando e Entrando...' : 'Entrar no Sistema'}</span>
              </button>
            </form>
          ) : mode === 'forgot' ? (
            /* FORGOT / RESET PASSWORD FORM */
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300">
                <p className="font-semibold text-white mb-1">Redefinição Rápida de Senha</p>
                <p className="text-[11px] text-slate-400">Informe seu e-mail cadastrado e defina a nova senha de acesso.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  E-mail Cadastrado
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com.br"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nova senha"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirmar
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/25"
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  E-mail Profissional
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com.br"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nome da Empresa
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Aquino Frios Distribuidora"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirmar
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300/90 leading-tight">
                ℹ️ Seu cadastro passará pela verificação do Administrador e será liberado após a aprovação.
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Solicitar Cadastro</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer Version Note */}
        <div className="p-4 text-center bg-slate-950 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-center">
          <span>v2.5.0</span>
        </div>
      </div>
    </div>
  );
};

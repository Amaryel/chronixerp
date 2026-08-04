/**
 * Aquinos Frios - Login & Registration Component
 * Permite Login e Cadastro de Usuários (Email e Senha) com reconhecimento automático do Superadmin (amaryelcc@gmail.com).
 */

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  Crown,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { storage, SUPERADMIN_EMAIL } from '../services/storage';
import logoImg from '../assets/images/aquino_frios_logo_1785856942770.jpg';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const companies = storage.getCompanies();

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [companyId, setCompanyId] = useState<string>(companies[0]?.id || 'comp-aquino');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isSuperadminAttempt = email.trim().toLowerCase() === SUPERADMIN_EMAIL;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Preencha o e-mail e a senha para continuar.');
      return;
    }

    const result = storage.login(email, password);
    if (!result.success || !result.user) {
      setErrorMessage(result.error || 'Erro ao realizar login.');
      return;
    }

    setSuccessMessage(`Bem-vindo de volta, ${result.user.name}!`);
    setTimeout(() => {
      onLoginSuccess(result.user!);
    }, 400);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

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

    const result = storage.registerUser({
      name,
      email,
      password,
      role: isSuperadminAttempt ? 'superadmin' : role,
      company_id: companyId,
    });

    if (!result.success || !result.user) {
      setErrorMessage(result.error || 'Erro ao realizar cadastro.');
      return;
    }

    setSuccessMessage(
      isSuperadminAttempt
        ? 'Conta Superadmin criada e ativada com sucesso!'
        : 'Cadastro realizado com sucesso! Aguarde a liberação ou acesse o sistema.'
    );

    setTimeout(() => {
      if (result.user) {
        // Log in user if login works
        const logResult = storage.login(email, password);
        if (logResult.success && logResult.user) {
          onLoginSuccess(logResult.user);
        }
      }
    }, 500);
  };

  // Shortcut login helper for testing
  const handleShortcutLogin = (shortcutEmail: string, shortcutPass = '123') => {
    setEmail(shortcutEmail);
    setPassword(shortcutPass);
    const result = storage.login(shortcutEmail, shortcutPass);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else if (result.error) {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background Decorative Lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto">
        {/* Header Branding */}
        <div className="p-6 pb-4 text-center border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900/80">
          <div className="inline-flex items-center justify-center p-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 mb-3 shadow-lg">
            <img
              src={logoImg}
              alt="Aquino Frios Logo"
              className="w-14 h-14 rounded-xl object-cover shadow-md border border-blue-500/30"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Aquino Frios</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Sistema de Gestão de Estoque, Vendas & Fiados
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

        {/* Error / Success Banners */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs font-semibold rounded-2xl flex items-start gap-2.5 shadow-md">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 text-xs font-semibold rounded-2xl flex items-start gap-2.5 shadow-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Superadmin Notification Banner */}
          {isSuperadminAttempt && (
            <div className="p-3 bg-amber-950/60 border border-amber-700/60 text-amber-200 text-xs font-bold rounded-2xl flex items-center gap-2.5 animate-pulse">
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="block font-black text-amber-300">
                  Usuário Superadmin Reconhecido
                </span>
                <span className="text-[11px] font-normal text-amber-200/80">
                  Acesso total a bloqueio de usuários e configuração do Supabase.
                </span>
              </div>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu e-mail (ex: amaryelcc@gmail.com)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Senha
                </label>
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
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 active:scale-98 mt-2"
              >
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: amaryelcc@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha"
                      className="w-full pl-9 pr-2 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repetir"
                      className="w-full pl-9 pr-2 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium transition"
                    />
                  </div>
                </div>
              </div>

              {!isSuperadminAttempt && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Empresas Disponíveis
                    </label>
                    <select
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-blue-500"
                    >
                      {companies.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} ({comp.document})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Perfil / Nível de Acesso
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('admin')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          role === 'admin'
                            ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Administrador</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole('funcionario')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          role === 'funcionario'
                            ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Funcionário</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 active:scale-98 mt-3"
              >
                <UserPlus className="w-4 h-4" />
                <span>Solicitar Cadastro e Acessar</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  AlertTriangle,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  ShieldAlert,
} from 'lucide-react';
import { Driver, SellerLoad } from '../types';
import { storage } from '../services/storage';

interface DriverManagementProps {
  onRefresh?: () => void;
  onNavigateToLoad?: (loadCode: string) => void;
}

export const DriverManagement: React.FC<DriverManagementProps> = ({
  onRefresh,
}) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [sellerLoads, setSellerLoads] = useState<SellerLoad[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Ficha / Histórico Modal State
  const [selectedDriverForHistory, setSelectedDriverForHistory] = useState<Driver | null>(null);

  // Delete Confirmation State
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Status Message Banner
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadData = () => {
    setDrivers(storage.getDrivers());
    setSellerLoads(storage.getSellerLoads());
    if (onRefresh) onRefresh();
  };

  useEffect(() => {
    loadData();
    const unsub = storage.subscribe(loadData);
    return () => unsub();
  }, []);

  const handleOpenNew = () => {
    setEditingDriver(null);
    setName('');
    setPhone('');
    setCpf('');
    setLicenseNumber('');
    setVehicle('');
    setLicensePlate('');
    setNotes('');
    setStatus('active');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (drv: Driver) => {
    setEditingDriver(drv);
    setName(drv.name || '');
    setPhone(drv.phone || '');
    setCpf(drv.cpf || '');
    setLicenseNumber(drv.license_number || '');
    setVehicle(drv.vehicle || '');
    setLicensePlate(drv.license_plate || '');
    setNotes(drv.notes || '');
    setStatus(drv.status || 'active');
    setIsFormOpen(true);
  };

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      storage.saveDriver({
        id: editingDriver ? editingDriver.id : undefined,
        name: name.trim(),
        phone: phone.trim() || undefined,
        cpf: cpf.trim() || undefined,
        license_number: licenseNumber.trim() || undefined,
        vehicle: vehicle.trim() || undefined,
        license_plate: licensePlate.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
      });

      setActionSuccessMessage(
        editingDriver
          ? `Motorista "${name}" atualizado com sucesso!`
          : `Motorista "${name}" cadastrado com sucesso!`
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);

      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar motorista.');
    }
  };

  const handleToggleStatus = (drv: Driver) => {
    const newStatus = drv.status === 'active' ? 'inactive' : 'active';
    storage.saveDriver({
      id: drv.id,
      status: newStatus,
    });
    setActionSuccessMessage(
      `Status do motorista "${drv.name}" alterado para ${newStatus === 'active' ? 'Ativo' : 'Inativo'}.`
    );
    setTimeout(() => setActionSuccessMessage(null), 4000);
    loadData();
  };

  const handlePromptDelete = (drv: Driver) => {
    setDriverToDelete(drv);
    setDeleteErrorMessage(null);
  };

  const handleConfirmDelete = () => {
    if (!driverToDelete) return;

    try {
      storage.deleteDriver(driverToDelete.id);
      setActionSuccessMessage(`Motorista "${driverToDelete.name}" excluído com sucesso.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setDriverToDelete(null);
      loadData();
    } catch (err: any) {
      setDeleteErrorMessage(err.message || 'Erro ao excluir motorista.');
    }
  };

  // Helper for Driver stats & history
  const getDriverStats = (driver: Driver) => {
    const driverLoads = sellerLoads.filter(
      (l) =>
        l.driver_id === driver.id ||
        (l.driver_name && l.driver_name.toLowerCase() === driver.name.toLowerCase())
    );

    const completedLoads = driverLoads.filter((l) => l.status === 'fechada' || (l.status as string) === 'concluida');
    const openLoads = driverLoads.filter((l) => l.status === 'em_viagem');

    // Sort by departure_date or date
    const sortedLoads = [...driverLoads].sort(
      (a, b) => new Date(b.departure_date || b.created_at).getTime() - new Date(a.departure_date || a.created_at).getTime()
    );

    const lastLoad = sortedLoads[0] || null;

    let totalSold = 0;
    let totalReceived = 0;
    let totalDifferences = 0;

    driverLoads.forEach((l) => {
      if (l.expected_financial) {
        totalSold += l.expected_financial.total_sold || 0;
      }
      if (l.actual_financial) {
        const rec =
          (l.actual_financial.dinheiro || 0) +
          (l.actual_financial.pix || 0) +
          (l.actual_financial.cartao || 0);
        totalReceived += rec;
      }
      if (l.financial_diff) {
        totalDifferences += l.financial_diff;
      }
    });

    return {
      driverLoads,
      completedLoadsCount: completedLoads.length,
      openLoadsCount: openLoads.length,
      lastLoad,
      totalSold,
      totalReceived,
      totalDifferences,
    };
  };

  // Filtered List
  const filteredDrivers = drivers.filter((drv) => {
    const matchesSearch =
      drv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (drv.phone && drv.phone.includes(searchTerm)) ||
      (drv.vehicle && drv.vehicle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (drv.license_plate && drv.license_plate.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (drv.cpf && drv.cpf.includes(searchTerm));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && drv.status !== 'inactive') ||
      (statusFilter === 'inactive' && drv.status === 'inactive');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 rounded-2xl">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Gestão de Motoristas</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Cadastros & Ficha das Rotas
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Cadastre e gerencie motoristas, veículos e consulte a ficha histórica de rotas
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Motorista</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Total de Motoristas</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
              {drivers.length}
            </span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Motoristas Ativos</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {drivers.filter((d) => d.status !== 'inactive').length}
            </span>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Rotas em Andamento</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
              {sellerLoads.filter((l) => l.status === 'em_viagem').length}
            </span>
          </div>
          <div className="p-3 bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 rounded-xl">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Total de Rotas Realizadas</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
              {sellerLoads.filter((l) => l.status === 'fechada' || (l.status as string) === 'concluida').length}
            </span>
          </div>
          <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, veículo, placa, CNH ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 shrink-0">Filtrar Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-extrabold text-slate-800 dark:text-slate-200"
          >
            <option value="all">Todos ({drivers.length})</option>
            <option value="active">Apenas Ativos</option>
            <option value="inactive">Apenas Inativos</option>
          </select>
        </div>
      </div>

      {/* Drivers List Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredDrivers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Truck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="font-extrabold text-sm text-slate-700 dark:text-slate-300">
              Nenhum motorista encontrado
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tente redefinir seus filtros de busca ou clique no botão acima para cadastrar um novo motorista.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] uppercase font-black tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Motorista</th>
                  <th className="py-3.5 px-4">Contato / CPF</th>
                  <th className="py-3.5 px-4">Veículo & Placa</th>
                  <th className="py-3.5 px-4">CNH</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Rotas</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {filteredDrivers.map((drv) => {
                  const stats = getDriverStats(drv);
                  const isActive = drv.status !== 'inactive';

                  return (
                    <tr
                      key={drv.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-black text-sm flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900">
                            {drv.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong className="font-extrabold text-slate-900 dark:text-white block text-sm">
                              {drv.name}
                            </strong>
                            {drv.notes && (
                              <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[200px]">
                                {drv.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          {drv.phone ? (
                            <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-200 font-bold">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{drv.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                          {drv.cpf && (
                            <div className="text-[10px] text-slate-500">
                              CPF: {drv.cpf}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div>
                          <strong className="font-bold text-slate-900 dark:text-slate-100 block">
                            {drv.vehicle || 'Não informado'}
                          </strong>
                          {drv.license_plate && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-700 dark:text-slate-300 inline-block mt-0.5">
                              Placa: {drv.license_plate}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400 font-bold">
                          {drv.license_number || '—'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(drv)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide uppercase cursor-pointer border transition ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100'
                          }`}
                          title="Clique para alternar status (Ativo / Inativo)"
                        >
                          {isActive ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-extrabold text-xs inline-flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />
                          <span>{stats.driverLoads.length}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedDriverForHistory(drv)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition font-bold text-xs flex items-center gap-1"
                            title="Ver Ficha / Histórico do Motorista"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">Ficha</span>
                          </button>

                          <button
                            onClick={() => handleOpenEdit(drv)}
                            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                            title="Editar Dados do Motorista"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handlePromptDelete(drv)}
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition"
                            title="Excluir Motorista"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FORM MODAL (NOVO / EDITAR MOTORISTA) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    {editingDriver ? 'Editar Cadastro de Motorista' : 'Novo Cadastro de Motorista'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Preencha os dados do motorista para utilização no módulo de Rotas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo de Sousa"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 98888-7777"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 123.456.789-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Número da CNH
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 01234567890"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status do Cadastro
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white"
                  >
                    <option value="active">Ativo (Habilitado para Rotas)</option>
                    <option value="inactive">Inativo (Desabilitado)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Veículo Principal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Fiorino Refrigerada"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Placa do Veículo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ABC-1234 ou BRA2E19"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Observações / Notas
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Observações internas sobre disponibilidade, regar de carregamento, etc..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingDriver ? 'Salvar Alterações' : 'Cadastrar Motorista'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FICHA DO MOTORISTA MODAL (HISTÓRICO E ESTATÍSTICAS) */}
      {selectedDriverForHistory && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 rounded-2xl">
                  <Truck className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 dark:text-white text-lg">
                      Ficha do Motorista: {selectedDriverForHistory.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        selectedDriverForHistory.status !== 'inactive'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {selectedDriverForHistory.status !== 'inactive' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Histórico completo de desempenho, vendas e conferências de rotas
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDriverForHistory(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Driver Personal & Contact Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] font-bold block">Telefone:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedDriverForHistory.phone || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] font-bold block">CPF:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedDriverForHistory.cpf || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] font-bold block">CNH:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedDriverForHistory.license_number || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] font-bold block">Veículo Fixado:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedDriverForHistory.vehicle || 'Nenhum'}{' '}
                  {selectedDriverForHistory.license_plate ? `(${selectedDriverForHistory.license_plate})` : ''}
                </span>
              </div>
            </div>

            {/* Driver Performance Stats Grid */}
            {(() => {
              const stats = getDriverStats(selectedDriverForHistory);
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60">
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block">
                        Rotas Concluídas
                      </span>
                      <span className="text-xl font-black text-blue-900 dark:text-blue-100 mt-1 block">
                        {stats.completedLoadsCount}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60">
                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block">
                        Rotas em Aberto
                      </span>
                      <span className="text-xl font-black text-amber-900 dark:text-amber-100 mt-1 block">
                        {stats.openLoadsCount}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60">
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
                        Total Vendido
                      </span>
                      <span className="text-lg font-black text-emerald-900 dark:text-emerald-100 mt-1 block">
                        R$ {stats.totalSold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60">
                      <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block">
                        Total Recebido
                      </span>
                      <span className="text-lg font-black text-purple-900 dark:text-purple-100 mt-1 block">
                        R$ {stats.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Last Load Info Banner */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 block uppercase">
                        Última Rota Realizada
                      </span>
                      {stats.lastLoad ? (
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                          Rota <strong className="text-slate-900 dark:text-white">#{stats.lastLoad.code}</strong> em{' '}
                          {new Date(stats.lastLoad.departure_date || stats.lastLoad.created_at).toLocaleDateString('pt-BR')}{' '}
                          — Vendedor: {stats.lastLoad.vendor_name} ({stats.lastLoad.status === 'fechada' || (stats.lastLoad.status as string) === 'concluida' ? 'Concluída' : 'Em Viagem'})
                        </p>
                      ) : (
                        <p className="text-slate-400 mt-0.5">Nenhuma rota associada a este motorista até o momento.</p>
                      )}
                    </div>

                    {stats.totalDifferences !== 0 && (
                      <div className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-extrabold text-[11px] shrink-0 border border-amber-300 dark:border-amber-800">
                        Diferença em Caixa: R$ {stats.totalDifferences.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>

                  {/* List of Linked Loads / Routes */}
                  <div className="space-y-3">
                    <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                      Histórico Detalhado de Rotas ({stats.driverLoads.length})
                    </h4>

                    {stats.driverLoads.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-xs">
                        Este motorista ainda não realizou nenhuma rota.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {stats.driverLoads.map((load) => (
                          <div
                            key={load.id}
                            className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-blue-600 dark:text-blue-400">
                                  #{load.code}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {new Date(load.departure_date || load.created_at).toLocaleDateString('pt-BR')}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    load.status === 'fechada' || (load.status as string) === 'concluida'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  }`}
                                >
                                  {load.status === 'fechada' || (load.status as string) === 'concluida' ? 'Concluída' : 'Em Viagem'}
                                </span>
                              </div>

                              <div className="font-extrabold text-slate-900 dark:text-white mt-1">
                                Vendedor: {load.vendor_name} {load.vehicle ? `| Veículo: ${load.vehicle}` : ''}
                              </div>

                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {load.items?.length || 0} item(ns) na carga
                                {load.expected_financial?.total_sold
                                  ? ` | Vendido: R$ ${load.expected_financial.total_sold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                  : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDriverForHistory(null)}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR DELETE DRIVER */}
      {driverToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  Excluir Motorista
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Confirmação de exclusão do cadastro
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <p>Deseja realmente excluir o motorista:</p>
              <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                {driverToDelete.name}
              </p>
              {driverToDelete.vehicle && (
                <p className="text-slate-500">Veículo: {driverToDelete.vehicle}</p>
              )}
            </div>

            {deleteErrorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-200 text-xs font-bold space-y-1">
                <div className="flex items-center gap-2 font-black text-rose-900 dark:text-rose-100">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Não foi possível excluir</span>
                </div>
                <p className="text-[11px] font-medium leading-relaxed">
                  {deleteErrorMessage}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDriverToDelete(null);
                  setDeleteErrorMessage(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition"
              >
                {deleteErrorMessage ? 'Entendido' : 'Cancelar'}
              </button>

              {!deleteErrorMessage && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-lg shadow-rose-600/20 bg-rose-600 hover:bg-rose-700 transition flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Sim, Excluir</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

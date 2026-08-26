import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Project, Vehicle } from '../types.ts';
import { 
  FolderKanban, 
  Truck, 
  Plus, 
  Edit3, 
  Trash2, 
  DollarSign, 
  Fuel, 
  Gauge, 
  User, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  X
} from 'lucide-react';

export const ProjectsVehiclesView: React.FC = () => {
  const { projects, vehicles, saveProject, deleteProject, saveVehicle, deleteVehicle } = useApp();
  const [activeTab, setActiveTab] = useState<'projects' | 'vehicles'>('projects');

  // Project Modal
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);

  // Vehicle Modal
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);

  // Projects Handlers
  const handleOpenAddProject = () => {
    setEditingProject({
      code: `PRJ-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
      name: '',
      client_name: '',
      budget: 100000,
      spent: 0,
      status: 'ACTIVO'
    });
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (p: Project) => {
    setEditingProject({ ...p });
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    await saveProject(editingProject);
    setIsProjectModalOpen(false);
    setEditingProject(null);
  };

  // Vehicles Handlers
  const handleOpenAddVehicle = () => {
    setEditingVehicle({
      plate: '',
      brand: '',
      model: '',
      driver_name: '',
      fuel_type: 'GASOLINA_PREMIUM',
      total_fuel_spent: 0,
      last_mileage: 0
    });
    setIsVehicleModalOpen(true);
  };

  const handleOpenEditVehicle = (v: Vehicle) => {
    setEditingVehicle({ ...v });
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    await saveVehicle(editingVehicle);
    setIsVehicleModalOpen(false);
    setEditingVehicle(null);
  };

  return (
    <div id="projects-vehicles-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
              {activeTab === 'projects' ? <FolderKanban className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
            </span>
            Proyectos, Obras y Flotilla
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Centros de imputación directa para clasificar compras, combustibles y gastos operativos por proyecto o vehículo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'projects' ? (
            <button
              id="btn-add-project"
              onClick={handleOpenAddProject}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proyecto / Obra
            </button>
          ) : (
            <button
              id="btn-add-vehicle"
              onClick={handleOpenAddVehicle}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Registrar Vehículo
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'projects'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          Proyectos y Obras ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'vehicles'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <Truck className="w-4 h-4" />
          Flotilla y Combustibles ({vehicles.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'projects' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const percent = p.budget > 0 ? Math.min(100, Math.round((p.spent / p.budget) * 100)) : 0;
            const isOver = p.spent > p.budget;

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                      {p.code}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.status === 'ACTIVO'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">{p.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Cliente / Destino: <strong className="text-slate-700 dark:text-slate-200">{p.client_name || 'Interno'}</strong>
                  </p>

                  {/* Budget bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-500">Ejecutado: RD$ {p.spent.toLocaleString()}</span>
                      <span className={isOver ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                        {percent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? 'bg-rose-500' : percent > 85 ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      Presupuesto: RD$ {p.budget.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => handleOpenEditProject(p)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar proyecto "${p.name}"?`)) deleteProject(p.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600">
                    {v.plate}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                    <Fuel className="w-3 h-3" />
                    {v.fuel_type.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                  {v.brand} {v.model}
                </h3>

                <div className="space-y-2 mt-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Conductor: <strong>{v.driver_name || 'Sin asignar'}</strong></span>
                  </div>
                  {v.last_mileage ? (
                    <div className="flex items-center gap-2">
                      <Gauge className="w-3.5 h-3.5 text-slate-400" />
                      <span>Odómetro: <strong>{v.last_mileage.toLocaleString()} KM</strong></span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    <span>Gasto Acumulado en Combustible: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">RD$ {v.total_fuel_spent.toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 mt-4 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  onClick={() => handleOpenEditVehicle(v)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`¿Eliminar vehículo con placa "${v.plate}"?`)) deleteVehicle(v.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Modal */}
      {isProjectModalOpen && editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {editingProject.id ? 'Editar Proyecto' : 'Nuevo Proyecto / Obra'}
              </h3>
              <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Código</label>
                <input
                  type="text"
                  required
                  value={editingProject.code || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nombre del Proyecto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Remodelación Sucursal Piantini"
                  value={editingProject.name || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cliente / Área Responsable</label>
                <input
                  type="text"
                  placeholder="Ej. Banco BHD / Operaciones"
                  value={editingProject.client_name || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, client_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Presupuesto Asignado (RD$)</label>
                <input
                  type="number"
                  required
                  value={editingProject.budget || 0}
                  onChange={(e) => setEditingProject({ ...editingProject, budget: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Modal */}
      {isVehicleModalOpen && editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {editingVehicle.id ? 'Editar Vehículo' : 'Registrar Vehículo'}
              </h3>
              <button onClick={() => setIsVehicleModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveVehicle} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Placa Oficial *</label>
                  <input
                    type="text"
                    required
                    placeholder="L384920"
                    value={editingVehicle.plate || ''}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, plate: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tipo Combustible</label>
                  <select
                    value={editingVehicle.fuel_type || 'GASOLINA_PREMIUM'}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, fuel_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                  >
                    <option value="GASOLINA_PREMIUM">Gasolina Premium</option>
                    <option value="GASOLINA_REGULAR">Gasolina Regular</option>
                    <option value="GASOIL_OPTIMO">Gasoil Óptimo</option>
                    <option value="GASOIL_REGULAR">Gasoil Regular</option>
                    <option value="GLP">Gas Licuado (GLP)</option>
                    <option value="ELECTRICO">Eléctrico / Híbrido</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Marca</label>
                  <input
                    type="text"
                    required
                    placeholder="Toyota"
                    value={editingVehicle.brand || ''}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Modelo / Año</label>
                  <input
                    type="text"
                    required
                    placeholder="Hilux 4x4 2023"
                    value={editingVehicle.model || ''}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, model: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Conductor Habitual</label>
                <input
                  type="text"
                  placeholder="Ej. Miguel Díaz"
                  value={editingVehicle.driver_name || ''}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, driver_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium">
                  Guardar Vehículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

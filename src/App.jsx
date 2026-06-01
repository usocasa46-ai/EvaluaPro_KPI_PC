import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { initialKpiAreaTemplates } from "./data/kpiAreaTemplates";
import { initialData } from "./data/initialData";
import Areas from "./pages/Areas";
import Amonestaciones from "./pages/Amonestaciones";
import AnalisisMovimientoProductos from "./pages/AnalisisMovimientoProductos";
import Colaboradores from "./pages/Colaboradores";
import Configuracion from "./pages/Configuracion";
import Dashboard from "./pages/Dashboard";
import Encargados from "./pages/Encargados";
import EvaluacionEncargados from "./pages/EvaluacionEncargados";
import EvaluacionKpiMensual from "./pages/EvaluacionKpiMensual";
import EvaluacionSubgerentes from "./pages/EvaluacionSubgerentes";
import Evaluaciones from "./pages/Evaluaciones";
import EvaluacionTrimestral from "./pages/EvaluacionTrimestral";
import Gerentes from "./pages/Gerentes";
import Incidencias from "./pages/Incidencias";
import KpiDiario from "./pages/KpiDiario";
import Login from "./pages/Login";
import Permisos from "./pages/Permisos";
import PlantillasKpiArea from "./pages/PlantillasKpiArea";
import Reportes from "./pages/Reportes";
import Subgerentes from "./pages/Subgerentes";
import SuperadminPanel from "./pages/SuperadminPanel";
import TrasladosPendientes from "./pages/TrasladosPendientes";
import UsuariosRoles from "./pages/UsuariosRoles";
import Vacaciones from "./pages/Vacaciones";
import {
  getAreaSummary,
  getEncargadoSummary,
  getGeneralKpi,
  getKpiResult,
  getSubgerenteSummary,
  clampPercentage,
  roundKpi,
  withCollaboratorKpi,
  withSubgerenteKpi,
} from "./services/kpiService";
import {
  MODULES,
  ROLES,
  canAccessModule,
  canAccessSettings,
  canEditMasterData,
  canCreateQuarterlyEvaluation,
  canCreateOperationalEvaluation,
  canCreateSubgerentes,
  canCreateUsers,
  filterAreasByUser,
  filterByRoleAndArea,
  filterCollaboratorsByUser,
  filterDataByUserRole,
  filterDailyKpiByUser,
  filterEvaluationsByUser,
  filterManagerEvaluationsByUser,
  filterMonthlyKpiByUser,
  filterQuarterlyEvaluationsByUser,
  filterRecordsByUserArea,
  filterSubManagerEvaluationsByUser,
  getAllowedQuarterlyTargets,
  getQuarterlyScopeAreas,
  getQuarterlyEvaluationTargetType,
  getVisibleModules,
  isSuperadmin,
} from "./services/permissionsService";
import { normalizeMonthlyEvaluation, normalizeTemplate } from "./services/kpiMonthlyService";
import { normalizeDailyKpiRecord } from "./services/dailyKpiService";
import { normalizeQuarterlyEvaluation } from "./services/quarterlyEvaluationService";
import { normalizeConfig } from "./services/configService";
import {
  attachCompanyToRecord,
  companyHasModule,
  ensureDefaultCompanies,
  filterByActiveCompany,
  migrateExistingDataToDefaultCompany,
  normalizeCompany,
  normalizeCompanyCode,
} from "./services/companyService";
import {
  normalizePermitRecord,
  normalizeVacationRecord,
  normalizeWarningRecord,
} from "./services/hrRecordsService";
import {
  STORAGE_KEYS,
  createId,
  resetKpiTemplatesOnly,
  resetOperationalDataKeepUsers,
  useLocalStorage,
} from "./services/storageService";
import { ensureDefaultSuperadmin } from "./services/superadminService";

function mergeConfig(configuracion) {
  return normalizeConfig(configuracion);
}

function mergeMissingById(current, seeds) {
  if (!Array.isArray(current) || !Array.isArray(seeds)) return current;
  const ids = new Set(current.map((item) => item.id));
  const missing = seeds.filter((item) => item.id && !ids.has(item.id));
  return missing.length ? [...current, ...missing] : current;
}

function templateIdentity(template) {
  return [template.area, template.puesto, template.indicador]
    .map((value) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+de\s+/gi, " ")
        .trim()
        .toLowerCase()
    )
    .join("|");
}

function mergeMissingTemplates(current, seeds) {
  if (!Array.isArray(current) || !Array.isArray(seeds)) return current;
  const keys = new Set(current.map((item) => templateIdentity(item)));
  const ids = new Set(current.map((item) => item.id));
  const missing = seeds
    .filter((item) => !keys.has(templateIdentity(item)))
    .map((item) => {
      if (!ids.has(item.id)) return item;
      const seedId = `KPT-SEED-${templateIdentity(item).replace(/[^a-z0-9]+/g, "-").slice(0, 48).toUpperCase()}`;
      ids.add(seedId);
      return { ...item, id: seedId };
    });
  return missing.length ? [...current, ...missing] : current;
}

function normalizeUser(user) {
  return {
    ...user,
    password: user.password || "1234",
    areasSupervisadas: user.areasSupervisadas || user.areasAsignadas || [],
    areasAsignadas: user.areasSupervisadas || user.areasAsignadas || [],
    estado: user.estado || "Activo",
  };
}

function upsertListItem(current, prefix, record) {
  const saved = { ...record, id: record.id || createId(prefix) };
  const exists = current.some((item) => item.id === saved.id);
  if (!exists) return [...current, saved];
  return current.map((item) => (item.id === saved.id ? saved : item));
}

function mergeMissingUsers(current, seeds) {
  if (!Array.isArray(current) || !Array.isArray(seeds)) return current;
  const seedById = new Map(seeds.map((user) => [user.id, normalizeUser(user)]));
  const normalizedCurrent = current.map((user) => {
    const seed = seedById.get(user.id);
    return seed ? { ...normalizeUser(user), ...seed } : normalizeUser(user);
  });
  const ids = new Set(normalizedCurrent.map((item) => item.id));
  const usuarios = new Set(normalizedCurrent.map((item) => item.usuario));
  const missing = seeds
    .map((user) => normalizeUser(user))
    .filter((user) => !ids.has(user.id) && !usuarios.has(user.usuario));
  return missing.length ? [...normalizedCurrent, ...missing] : normalizedCurrent;
}

function monthlyEvaluationsToDashboardRows(evaluations = []) {
  return evaluations.flatMap((evaluation) => {
    const members = Array.isArray(evaluation.colaboradoresEvaluados) && evaluation.colaboradoresEvaluados.length
      ? evaluation.colaboradoresEvaluados
      : [
          {
            colaboradorId: evaluation.colaboradorId || "",
            colaboradorNombre: evaluation.colaboradorNombre || evaluation.colaborador || "Evaluación por área",
            kpiMensual: evaluation.kpiMensual || 0,
          },
        ];

    return members.map((member, index) => {
      const kpi = roundKpi(clampPercentage(member.kpiMensual ?? evaluation.kpiMensual ?? 0));
      return {
        id: `${evaluation.id || "KPM"}-${member.colaboradorId || index}`,
        fecha: evaluation.periodo,
        periodo: evaluation.periodo,
        colaboradorId: member.colaboradorId || "",
        colaborador: member.colaboradorNombre || "Evaluación por área",
        colaboradorNombre: member.colaboradorNombre || "Evaluación por área",
        area: evaluation.area,
        empresaId: evaluation.empresaId || "",
        codigoEmpresa: evaluation.codigoEmpresa || "",
        evaluadorId: evaluation.evaluadorId || "",
        evaluador: evaluation.evaluadorNombre || "",
        evaluadorNombre: evaluation.evaluadorNombre || "",
        kpi,
        kpiMensual: kpi,
        resultado: getKpiResult(kpi),
        estado: evaluation.estado || "",
      };
    });
  });
}

export default function App() {
  const [view, setView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [areas, setAreas] = useLocalStorage(STORAGE_KEYS.areas, initialData.areas);
  const [encargados, setEncargados] = useLocalStorage(STORAGE_KEYS.encargados, initialData.encargados);
  const [colaboradores, setColaboradores] = useLocalStorage(STORAGE_KEYS.colaboradores, initialData.colaboradores);
  const [evaluaciones, setEvaluaciones] = useLocalStorage(STORAGE_KEYS.evaluaciones, initialData.evaluaciones);
  const [evaluacionesTrimestrales, setEvaluacionesTrimestrales] = useLocalStorage(
    STORAGE_KEYS.evaluacionesTrimestrales,
    []
  );
  const [kpiAreaTemplates, setKpiAreaTemplates] = useLocalStorage(
    STORAGE_KEYS.kpiAreaTemplates,
    initialKpiAreaTemplates
  );
  const [kpiMonthlyEvaluations, setKpiMonthlyEvaluations] = useLocalStorage(
    STORAGE_KEYS.kpiMonthlyEvaluations,
    []
  );
  const [kpiDailyRecords, setKpiDailyRecords] = useLocalStorage(STORAGE_KEYS.kpiDailyRecords, []);
  const [vacacionesRecords, setVacacionesRecords] = useLocalStorage(STORAGE_KEYS.vacacionesRecords, []);
  const [permisosRecords, setPermisosRecords] = useLocalStorage(STORAGE_KEYS.permisosRecords, []);
  const [amonestacionesRecords, setAmonestacionesRecords] = useLocalStorage(
    STORAGE_KEYS.amonestacionesRecords,
    []
  );
  const [incidencias, setIncidencias] = useLocalStorage(STORAGE_KEYS.incidencias, initialData.incidencias);
  const [subgerentes, setSubgerentes] = useLocalStorage(STORAGE_KEYS.subgerentes, initialData.subgerentes);
  const [evaluacionesSubgerente, setEvaluacionesSubgerente] = useLocalStorage(
    STORAGE_KEYS.evaluacionesSubgerente,
    initialData.evaluacionesSubgerente
  );
  const [evaluacionesEncargado, setEvaluacionesEncargado] = useLocalStorage(
    STORAGE_KEYS.evaluacionesEncargado,
    initialData.evaluacionesEncargado
  );
  const [gerentes, setGerentes] = useLocalStorage(STORAGE_KEYS.gerentes, initialData.gerentes);
  const [usuarios, setUsuarios] = useLocalStorage(STORAGE_KEYS.usuarios, ensureDefaultSuperadmin(initialData.usuarios));
  const [companies, setCompanies] = useLocalStorage(
    STORAGE_KEYS.companies,
    ensureDefaultCompanies([], initialData.configuracion)
  );
  const [configuracion, setConfiguracion] = useLocalStorage(STORAGE_KEYS.configuracion, initialData.configuracion);
  const [activeSession, setActiveSession] = useLocalStorage(STORAGE_KEYS.activeUserId, null);
  const [activeCompany, setActiveCompany] = useLocalStorage(STORAGE_KEYS.activeCompany, null);
  const [quarterlyStartSignal, setQuarterlyStartSignal] = useState(0);

  const performOperationalReset = useCallback(() => {
    resetOperationalDataKeepUsers();
    setAreas(initialData.areas);
    setEncargados([]);
    setColaboradores([]);
    setEvaluaciones([]);
    setEvaluacionesTrimestrales([]);
    setKpiMonthlyEvaluations([]);
    setKpiDailyRecords([]);
    setIncidencias([]);
    setSubgerentes([]);
    setEvaluacionesSubgerente([]);
    setEvaluacionesEncargado([]);
    setGerentes([]);
  }, [
    setColaboradores,
    setEncargados,
    setEvaluaciones,
    setEvaluacionesEncargado,
    setEvaluacionesSubgerente,
    setEvaluacionesTrimestrales,
    setGerentes,
    setIncidencias,
    setKpiDailyRecords,
    setKpiMonthlyEvaluations,
    setSubgerentes,
    setAreas,
  ]);

  const activeUser = useMemo(() => {
    const activeId = typeof activeSession === "string" ? activeSession : activeSession?.id;
    const user = usuarios.find((item) => item.id === activeId && item.estado !== "Inactivo") || null;
    if (!user || isSuperadmin(user)) return user;
    return {
      ...user,
      empresaId: user.empresaId || activeSession?.currentCompanyId || "",
      codigoEmpresa: user.codigoEmpresa || activeSession?.currentCompanyCode || "",
    };
  }, [activeSession, usuarios]);

  const safeConfig = useMemo(() => mergeConfig(configuracion), [configuracion]);
  const currentCompany = useMemo(() => {
    if (isSuperadmin(activeUser)) return null;
    if (activeCompany?.id) return normalizeCompany(activeCompany);
    const userCompany = companies.find((company) => {
      return company.id === activeUser?.empresaId || normalizeCompanyCode(company.codigoEmpresa) === normalizeCompanyCode(activeUser?.codigoEmpresa);
    });
    return userCompany ? normalizeCompany(userCompany) : null;
  }, [activeCompany, activeUser, companies]);
  const modules = useMemo(() => {
    const visibleModules = getVisibleModules(activeUser);
    if (isSuperadmin(activeUser)) return visibleModules;
    if (!currentCompany) return visibleModules;
    return visibleModules.filter((module) => companyHasModule(currentCompany, module.id));
  }, [activeUser, currentCompany]);

  useEffect(() => {
    const defaultCompany = migrateExistingDataToDefaultCompany(initialData.configuracion);
    const attachList = (records) => records.map((record) => attachCompanyToRecord(record, defaultCompany));

    setAreas((current) => attachList(mergeMissingById(current, initialData.areas)));
    setEncargados((current) => attachList(mergeMissingById(current, initialData.encargados)));
    setColaboradores((current) => attachList(mergeMissingById(current, initialData.colaboradores)));
    setUsuarios((current) => ensureDefaultSuperadmin(attachList(mergeMissingUsers(current, initialData.usuarios))));
    setCompanies((current) => ensureDefaultCompanies(current, initialData.configuracion));
    setKpiAreaTemplates((current) => attachList(mergeMissingTemplates(current, initialKpiAreaTemplates)));
    setEvaluaciones((current) => attachList(current));
    setEvaluacionesTrimestrales((current) => attachList(current));
    setKpiMonthlyEvaluations((current) => attachList(current));
    setKpiDailyRecords((current) => attachList(current));
    setVacacionesRecords((current) => attachList(current));
    setPermisosRecords((current) => attachList(current));
    setAmonestacionesRecords((current) => attachList(current));
    setIncidencias((current) => attachList(current));
    setSubgerentes((current) => attachList(current));
    setEvaluacionesSubgerente((current) => attachList(current));
    setEvaluacionesEncargado((current) => attachList(current));
    setGerentes((current) => attachList(current));
  }, [
    setAmonestacionesRecords,
    setAreas,
    setColaboradores,
    setCompanies,
    setEncargados,
    setEvaluaciones,
    setEvaluacionesEncargado,
    setEvaluacionesSubgerente,
    setEvaluacionesTrimestrales,
    setGerentes,
    setIncidencias,
    setKpiAreaTemplates,
    setKpiDailyRecords,
    setKpiMonthlyEvaluations,
    setPermisosRecords,
    setSubgerentes,
    setUsuarios,
    setVacacionesRecords,
  ]);

  useEffect(() => {
    if (!activeUser || isSuperadmin(activeUser) || currentCompany) return;
    const fallbackCompany = companies.find((company) => normalizeCompanyCode(company.codigoEmpresa) === "SUPERMIX");
    if (fallbackCompany) setActiveCompany(normalizeCompany(fallbackCompany));
  }, [activeUser, companies, currentCompany, setActiveCompany]);

  const evaluationsKpi = useMemo(() => withCollaboratorKpi(evaluaciones), [evaluaciones]);
  const subgerenteEvaluationsKpi = useMemo(() => withSubgerenteKpi(evaluacionesSubgerente), [evaluacionesSubgerente]);
  const encargadoEvaluationsKpi = useMemo(
    () => evaluacionesEncargado.map((evaluation) => ({ ...evaluation, kpi: Number(evaluation.kpi || 0) })),
    [evaluacionesEncargado]
  );
  const normalizedEvaluacionesTrimestrales = useMemo(
    () => evaluacionesTrimestrales.map((evaluation) => normalizeQuarterlyEvaluation(evaluation)),
    [evaluacionesTrimestrales]
  );
  const normalizedKpiAreaTemplates = useMemo(
    () => kpiAreaTemplates.map((template) => normalizeTemplate(template)),
    [kpiAreaTemplates]
  );
  const normalizedKpiMonthlyEvaluations = useMemo(
    () => kpiMonthlyEvaluations.map((evaluation) => normalizeMonthlyEvaluation(evaluation)),
    [kpiMonthlyEvaluations]
  );
  const monthlyDashboardRows = useMemo(
    () => monthlyEvaluationsToDashboardRows(normalizedKpiMonthlyEvaluations),
    [normalizedKpiMonthlyEvaluations]
  );

  const companyAreas = useMemo(() => filterByActiveCompany(areas, currentCompany), [areas, currentCompany]);
  const companyEncargados = useMemo(() => filterByActiveCompany(encargados, currentCompany), [encargados, currentCompany]);
  const companyColaboradores = useMemo(() => filterByActiveCompany(colaboradores, currentCompany), [colaboradores, currentCompany]);
  const companyEvaluationsKpi = useMemo(() => filterByActiveCompany(evaluationsKpi, currentCompany), [currentCompany, evaluationsKpi]);
  const companyKpiAreaTemplates = useMemo(
    () => filterByActiveCompany(normalizedKpiAreaTemplates, currentCompany),
    [currentCompany, normalizedKpiAreaTemplates]
  );
  const companyKpiMonthlyEvaluations = useMemo(
    () => filterByActiveCompany(normalizedKpiMonthlyEvaluations, currentCompany),
    [currentCompany, normalizedKpiMonthlyEvaluations]
  );
  const companyKpiDailyRecords = useMemo(() => filterByActiveCompany(kpiDailyRecords, currentCompany), [currentCompany, kpiDailyRecords]);
  const companyVacacionesRecords = useMemo(() => filterByActiveCompany(vacacionesRecords, currentCompany), [currentCompany, vacacionesRecords]);
  const companyPermisosRecords = useMemo(() => filterByActiveCompany(permisosRecords, currentCompany), [currentCompany, permisosRecords]);
  const companyAmonestacionesRecords = useMemo(
    () => filterByActiveCompany(amonestacionesRecords, currentCompany),
    [amonestacionesRecords, currentCompany]
  );
  const companyMonthlyDashboardRows = useMemo(
    () => filterByActiveCompany(monthlyDashboardRows, currentCompany),
    [currentCompany, monthlyDashboardRows]
  );
  const companyEvaluacionesEncargado = useMemo(
    () => filterByActiveCompany(encargadoEvaluationsKpi, currentCompany),
    [currentCompany, encargadoEvaluationsKpi]
  );
  const companyEvaluacionesSubgerente = useMemo(
    () => filterByActiveCompany(subgerenteEvaluationsKpi, currentCompany),
    [currentCompany, subgerenteEvaluationsKpi]
  );
  const companyIncidencias = useMemo(() => filterByActiveCompany(incidencias, currentCompany), [currentCompany, incidencias]);
  const companySubgerentes = useMemo(() => filterByActiveCompany(subgerentes, currentCompany), [currentCompany, subgerentes]);
  const companyGerentes = useMemo(() => filterByActiveCompany(gerentes, currentCompany), [currentCompany, gerentes]);
  const companyUsuarios = useMemo(() => filterByActiveCompany(usuarios, currentCompany), [currentCompany, usuarios]);

  const visibleAreas = useMemo(() => filterAreasByUser(companyAreas, activeUser, companySubgerentes), [companyAreas, activeUser, companySubgerentes]);
  const visibleEncargados = useMemo(
    () => filterDataByUserRole(companyEncargados, activeUser, "area", companySubgerentes),
    [companyEncargados, activeUser, companySubgerentes]
  );
  const visibleColaboradores = useMemo(
    () => filterCollaboratorsByUser(activeUser, companyColaboradores, companySubgerentes),
    [activeUser, companyColaboradores, companySubgerentes]
  );
  const visibleEvaluaciones = useMemo(
    () => filterEvaluationsByUser(activeUser, companyEvaluationsKpi, companySubgerentes),
    [activeUser, companyEvaluationsKpi, companySubgerentes]
  );
  const visibleKpiAreaTemplates = useMemo(
    () => filterByRoleAndArea(companyKpiAreaTemplates, activeUser, "area", companySubgerentes),
    [activeUser, companyKpiAreaTemplates, companySubgerentes]
  );
  const visibleKpiMonthlyEvaluations = useMemo(
    () => filterMonthlyKpiByUser(activeUser, companyKpiMonthlyEvaluations, companySubgerentes),
    [activeUser, companyKpiMonthlyEvaluations, companySubgerentes]
  );
  const visibleKpiDailyRecords = useMemo(
    () => filterDailyKpiByUser(activeUser, companyKpiDailyRecords, companySubgerentes),
    [activeUser, companyKpiDailyRecords, companySubgerentes]
  );
  const visibleVacacionesRecords = useMemo(
    () => filterRecordsByUserArea(activeUser, companyVacacionesRecords, companySubgerentes),
    [activeUser, companyVacacionesRecords, companySubgerentes]
  );
  const visiblePermisosRecords = useMemo(
    () => filterRecordsByUserArea(activeUser, companyPermisosRecords, companySubgerentes),
    [activeUser, companyPermisosRecords, companySubgerentes]
  );
  const visibleAmonestacionesRecords = useMemo(
    () => filterRecordsByUserArea(activeUser, companyAmonestacionesRecords, companySubgerentes),
    [activeUser, companyAmonestacionesRecords, companySubgerentes]
  );
  const visibleMonthlyDashboardRows = useMemo(
    () => filterDataByUserRole(companyMonthlyDashboardRows, activeUser, "area", companySubgerentes),
    [activeUser, companyMonthlyDashboardRows, companySubgerentes]
  );
  const visibleEvaluacionesEncargado = useMemo(
    () => filterManagerEvaluationsByUser(activeUser, companyEvaluacionesEncargado, companySubgerentes),
    [activeUser, companyEvaluacionesEncargado, companySubgerentes]
  );
  const visibleEvaluacionesSubgerente = useMemo(
    () => filterSubManagerEvaluationsByUser(activeUser, companyEvaluacionesSubgerente, companySubgerentes),
    [activeUser, companyEvaluacionesSubgerente, companySubgerentes]
  );
  const visibleIncidencias = useMemo(
    () => filterDataByUserRole(companyIncidencias, activeUser, "area", companySubgerentes),
    [companyIncidencias, activeUser, companySubgerentes]
  );
  const visibleSubgerentes = useMemo(
    () => (canUseView("subgerentes") ? companySubgerentes : []),
    [activeUser, companySubgerentes, currentCompany]
  );
  const visibleGerentes = useMemo(
    () => (canUseView("gerentes") ? companyGerentes : []),
    [activeUser, companyGerentes, currentCompany]
  );
  const visibleUsuarios = useMemo(
    () => {
      if (!canUseView("usuarios-roles")) return [];
      return isSuperadmin(activeUser) ? usuarios : companyUsuarios.filter((user) => !isSuperadmin(user));
    },
    [activeUser, companyUsuarios, currentCompany, usuarios]
  );
  const quarterlyScopeAreas = useMemo(
    () => getQuarterlyScopeAreas(activeUser, companySubgerentes),
    [activeUser, companySubgerentes]
  );
  const quarterlyTargetType = useMemo(() => getQuarterlyEvaluationTargetType(activeUser), [activeUser]);
  const quarterlyTargets = useMemo(
    () => getAllowedQuarterlyTargets(activeUser, companyColaboradores, companyEncargados, companySubgerentes, companyUsuarios),
    [activeUser, companyColaboradores, companyEncargados, companySubgerentes, companyUsuarios]
  );
  const visibleEvaluacionesTrimestrales = useMemo(
    () => filterQuarterlyEvaluationsByUser(activeUser, filterByActiveCompany(normalizedEvaluacionesTrimestrales, currentCompany), companySubgerentes),
    [activeUser, normalizedEvaluacionesTrimestrales, currentCompany, companySubgerentes]
  );

  const areaSummary = useMemo(
    () => getAreaSummary(visibleAreas, visibleMonthlyDashboardRows, visibleEncargados, visibleColaboradores, visibleIncidencias),
    [visibleAreas, visibleMonthlyDashboardRows, visibleEncargados, visibleColaboradores, visibleIncidencias]
  );

  const globalAreaSummary = useMemo(
    () => getAreaSummary(companyAreas, companyMonthlyDashboardRows, companyEncargados, companyColaboradores, companyIncidencias),
    [companyAreas, companyMonthlyDashboardRows, companyEncargados, companyColaboradores, companyIncidencias]
  );

  const encargadoSummary = useMemo(
    () => getEncargadoSummary(visibleEncargados, areaSummary),
    [visibleEncargados, areaSummary]
  );

  const subgerenteSummary = useMemo(
    () => getSubgerenteSummary(visibleSubgerentes, globalAreaSummary, companyEvaluacionesSubgerente),
    [visibleSubgerentes, globalAreaSummary, companyEvaluacionesSubgerente]
  );

  const kpiGeneral = useMemo(() => getGeneralKpi(visibleMonthlyDashboardRows), [visibleMonthlyDashboardRows]);
  const topColaboradores = useMemo(
    () => [...visibleMonthlyDashboardRows].sort((a, b) => b.kpi - a.kpi).slice(0, 10),
    [visibleMonthlyDashboardRows]
  );

  const canManageCatalogs = canEditMasterData(activeUser);
  const canCreateOperational = canCreateOperationalEvaluation(activeUser);

  function canUseView(moduleId) {
    if (!canAccessModule(activeUser, moduleId)) return false;
    if (isSuperadmin(activeUser)) return true;
    if (!currentCompany) return false;
    return companyHasModule(currentCompany, moduleId);
  }

  function withCurrentCompany(record) {
    if (isSuperadmin(activeUser)) return record;
    return attachCompanyToRecord(record, currentCompany);
  }

  function addRecord(setter, prefix, record) {
    setter((current) => [...current, withCurrentCompany({ id: createId(prefix), ...record })]);
  }

  function upsertArea(record) {
    const saved = withCurrentCompany({ ...record, id: record.id || createId("ARE") });
    setAreas((current) => upsertListItem(current, "ARE", saved));

    if (saved.encargadoId) {
      setEncargados((current) =>
        current.map((encargado) =>
          encargado.id === saved.encargadoId
            ? { ...encargado, areaId: saved.id, areaNombre: saved.nombre, area: saved.nombre }
            : encargado
        )
      );
    }

    return saved;
  }

  function upsertEncargado(record) {
    const saved = withCurrentCompany({ ...record, id: record.id || createId("ENC") });
    setEncargados((current) => upsertListItem(current, "ENC", saved));

    if (saved.areaId) {
      setAreas((current) =>
        current.map((area) =>
          area.id === saved.areaId
            ? {
                ...area,
                encargadoId: saved.id,
                encargadoNombre: saved.nombre,
                encargado: saved.nombre,
                subgerenteId: saved.subgerenteId || area.subgerenteId || "",
                subgerenteNombre: saved.subgerenteNombre || area.subgerenteNombre || "",
              }
            : area
        )
      );
    }

    if (saved.usuarioId) {
      setUsuarios((current) =>
        current.map((user) =>
          user.id === saved.usuarioId
            ? { ...user, rol: ROLES.ENCARGADO, areaAsignada: saved.areaNombre || saved.area, encargadoId: saved.id }
            : user
        )
      );
    }

    return saved;
  }

  function upsertColaborador(record) {
    const saved = withCurrentCompany({ ...record, id: record.id || createId("COL") });
    setColaboradores((current) => upsertListItem(current, "COL", saved));
    return saved;
  }

  function upsertSubgerente(record) {
    const saved = withCurrentCompany({ ...record, id: record.id || createId("SUB") });
    const supervisedAreas = saved.areasSupervisadas || saved.areas || [];
    setSubgerentes((current) => upsertListItem(current, "SUB", { ...saved, areasSupervisadas: supervisedAreas, areas: supervisedAreas }));

    setAreas((current) =>
      current.map((area) =>
        supervisedAreas.some((scopeArea) => scopeArea === area.nombre)
          ? { ...area, subgerenteId: saved.id, subgerenteNombre: saved.nombre }
          : area
      )
    );

    if (saved.usuarioId) {
      setUsuarios((current) =>
        current.map((user) =>
          user.id === saved.usuarioId
            ? {
                ...user,
                rol: ROLES.SUBGERENTE,
                areasSupervisadas: supervisedAreas,
                areasAsignadas: supervisedAreas,
                subgerenteId: saved.id,
              }
            : user
        )
      );
    }

    return saved;
  }

  function login(codigoEmpresa, usuario, password) {
    const normalizedCompanyCode = normalizeCompanyCode(codigoEmpresa);
    const normalizedUsuario = String(usuario || "").trim().toLowerCase();

    if (!normalizedCompanyCode) {
      return { ok: false, message: "Debe indicar el codigo de empresa." };
    }

    if (["SISTEMA", "SUPERADMIN"].includes(normalizedCompanyCode)) {
      const systemUser = usuarios.find((item) => {
        return (
          item.estado !== "Inactivo" &&
          isSuperadmin(item) &&
          String(item.usuario || "").trim().toLowerCase() === normalizedUsuario
        );
      });

      if (!systemUser || String(systemUser.password || "") !== String(password || "")) {
        return { ok: false, message: "Usuario o contrasena de Superadmin incorrectos." };
      }

      setActiveCompany(null);
      setActiveSession({
        id: systemUser.id,
        usuario: systemUser.usuario,
        loggedAt: new Date().toISOString(),
        currentCompanyId: null,
        currentCompanyCode: "SISTEMA",
        currentCompanyName: "Sistema",
      });
      setView("superadminPanel");
      return { ok: true };
    }

    const company = companies.find((item) => normalizeCompanyCode(item.codigoEmpresa) === normalizedCompanyCode);
    if (!company) {
      return { ok: false, message: "Codigo de empresa no registrado." };
    }
    if (company.estado === "Inactiva" || company.estado === "Suspendida") {
      return { ok: false, message: "Esta empresa no esta activa." };
    }

    const companyUser = usuarios.find((item) => {
      const sameUsername = String(item.usuario || "").trim().toLowerCase() === normalizedUsuario;
      const legacyDefaultUser = !item.empresaId && !item.codigoEmpresa && normalizedCompanyCode === "SUPERMIX";
      const sameCompany =
        item.empresaId === company.id ||
        normalizeCompanyCode(item.codigoEmpresa || "") === normalizeCompanyCode(company.codigoEmpresa) ||
        legacyDefaultUser;
      return item.estado !== "Inactivo" && !isSuperadmin(item) && sameUsername && sameCompany;
    });

    if (!companyUser || String(companyUser.password || "") !== String(password || "")) {
      return { ok: false, message: "Usuario o contrasena incorrectos." };
    }

    const normalizedCompany = normalizeCompany(company);
    setActiveCompany(normalizedCompany);
    setActiveSession({
      id: companyUser.id,
      usuario: companyUser.usuario,
      loggedAt: new Date().toISOString(),
      currentCompanyId: normalizedCompany.id,
      currentCompanyCode: normalizedCompany.codigoEmpresa,
      currentCompanyName: normalizedCompany.nombreEmpresa,
    });
    setView("dashboard");
    return { ok: true };

    const user = usuarios.find((item) => {
      return item.estado !== "Inactivo" && String(item.usuario || "").toLowerCase() === normalizedUsuario;
    });

    if (!user || String(user.password || "") !== String(password || "")) {
      return { ok: false, message: "Usuario o contraseña incorrectos." };
    }

    setActiveSession({ id: user.id, usuario: user.usuario, loggedAt: new Date().toISOString() });
    setView(isSuperadmin(user) ? "superadminPanel" : "dashboard");
    return { ok: true };
  }

  function logout() {
    setActiveSession(null);
    setActiveCompany(null);
    setView("dashboard");
  }

  function upsertUser(record) {
    const normalized = normalizeUser(record);
    const saved = withCurrentCompany({ ...normalized, id: normalized.id || createId("USR") });

    if (isSuperadmin(saved) && !isSuperadmin(activeUser)) {
      window.alert("Solo el Superadmin puede crear o editar usuarios Superadmin.");
      return null;
    }

    setUsuarios((current) => {
      const exists = current.some((user) => user.id === saved.id);
      if (!exists) return [...current, saved];
      return current.map((user) => (user.id === saved.id ? saved : user));
    });

    if (saved.rol === ROLES.ENCARGADO && saved.encargadoId) {
      setEncargados((current) =>
        current.map((encargado) =>
          encargado.id === saved.encargadoId
            ? {
                ...encargado,
                usuarioId: saved.id,
                areaNombre: saved.areaAsignada || encargado.areaNombre || encargado.area,
                area: saved.areaAsignada || encargado.area,
              }
            : encargado
        )
      );
    }

    if (saved.rol === ROLES.SUBGERENTE && saved.subgerenteId) {
      setSubgerentes((current) =>
        current.map((subgerente) =>
          subgerente.id === saved.subgerenteId
            ? {
                ...subgerente,
                usuarioId: saved.id,
                areasSupervisadas: saved.areasSupervisadas || saved.areasAsignadas || subgerente.areasSupervisadas || [],
                areas: saved.areasSupervisadas || saved.areasAsignadas || subgerente.areas || [],
              }
            : subgerente
        )
      );
    }

    return saved;
  }

  function toggleUserStatus(id) {
    const targetUser = usuarios.find((user) => user.id === id);
    if (isSuperadmin(targetUser) && !isSuperadmin(activeUser)) {
      window.alert("Solo el Superadmin puede activar o inactivar usuarios Superadmin.");
      return;
    }

    setUsuarios((current) =>
      current.map((user) =>
        user.id === id ? { ...user, estado: user.estado === "Inactivo" ? "Activo" : "Inactivo" } : user
      )
    );
  }

  function upsertCompany(record) {
    if (!isSuperadmin(activeUser)) {
      window.alert("Solo el Superadmin puede administrar empresas.");
      return null;
    }

    const saved = normalizeCompany({
      ...record,
      id: record.id || createId("EMP"),
      createdById: record.createdById || activeUser?.id || "",
      createdByName: record.createdByName || activeUser?.nombre || "",
      updatedAt: new Date().toISOString(),
    });

    const duplicate = companies.some(
      (company) => company.id !== saved.id && normalizeCompanyCode(company.codigoEmpresa) === saved.codigoEmpresa
    );
    if (duplicate) {
      window.alert("Ya existe una empresa con ese codigo.");
      return null;
    }

    setCompanies((current) => upsertListItem(current, "EMP", saved));
    return saved;
  }

  function createInitialCompanyManager(record) {
    if (!isSuperadmin(activeUser)) {
      window.alert("Solo el Superadmin puede crear el gerente inicial.");
      return null;
    }

    const company = companies.find((item) => item.id === record.companyId);
    if (!company) {
      window.alert("Seleccione una empresa valida.");
      return null;
    }

    const username = String(record.usuario || "").trim().toLowerCase();
    const exists = usuarios.some((user) => {
      return (
        !isSuperadmin(user) &&
        String(user.usuario || "").trim().toLowerCase() === username &&
        (user.empresaId === company.id ||
          normalizeCompanyCode(user.codigoEmpresa || "") === normalizeCompanyCode(company.codigoEmpresa))
      );
    });

    if (exists) {
      window.alert("Ya existe un usuario con ese nombre dentro de esta empresa.");
      return null;
    }

    const saved = normalizeUser({
      id: record.id || createId("USR"),
      nombre: record.nombre,
      usuario: record.usuario,
      password: record.password || "1234",
      rol: ROLES.GERENTE,
      areaAsignada: "",
      areasSupervisadas: [],
      areasAsignadas: [],
      estado: "Activo",
      empresaId: company.id,
      codigoEmpresa: normalizeCompanyCode(company.codigoEmpresa),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setUsuarios((current) => [...current, saved]);
    return saved;
  }

  function changeUserPassword(userId, password) {
    if (!isSuperadmin(activeUser)) {
      window.alert("Solo el Superadmin puede cambiar contraseñas desde este panel.");
      return false;
    }

    const nextPassword = String(password || "").trim();
    if (!nextPassword) return false;

    setUsuarios((current) =>
      current.map((user) =>
        user.id === userId ? { ...user, password: nextPassword, updatedAt: new Date().toISOString() } : user
      )
    );

    return true;
  }

  function confirmOperationalReset() {
    const confirmed = window.confirm(
      "Esta acción borrará colaboradores, evaluaciones, incidencias y reportes, pero conservará usuarios. ¿Deseas continuar?"
    );
    if (!confirmed) return;
    performOperationalReset();
    setView("dashboard");
  }

  function openNewQuarterlyEvaluationFromDashboard() {
    if (!canCreateQuarterlyEvaluation(activeUser)) {
      window.alert("No tienes permiso para crear esta evaluación.");
      return;
    }
    setView("evaluacionTrimestral");
    setQuarterlyStartSignal((value) => value + 1);
  }

  function upsertQuarterlyEvaluation(record) {
    const normalized = normalizeQuarterlyEvaluation({
      ...record,
      createdByRole: record.createdByRole || activeUser?.rol || "",
      createdByUserId: record.createdByUserId || activeUser?.id || "",
      createdByName: record.createdByName || activeUser?.nombre || "",
      evaluatedType: record.evaluatedType || quarterlyTargetType,
      evaluatedUserId: record.evaluatedUserId || record.colaboradorId || "",
      evaluatedName: record.evaluatedName || record.nombreColaborador || "",
      evaluatedRole: record.evaluatedRole || record.cargo || "",
    });
    const saved = withCurrentCompany({ ...normalized, id: normalized.id || createId("ETRI") });

    setEvaluacionesTrimestrales((current) => {
      const exists = current.some((evaluation) => evaluation.id === saved.id);
      if (!exists) return [...current, saved];
      return current.map((evaluation) => (evaluation.id === saved.id ? saved : evaluation));
    });

    return saved;
  }

  function upsertKpiAreaTemplate(record) {
    const normalized = normalizeTemplate(record);
    const saved = withCurrentCompany({ ...normalized, id: normalized.id || createId("KPT") });

    setKpiAreaTemplates((current) => {
      const exists = current.some((template) => template.id === saved.id);
      if (!exists) return [...current, saved];
      return current.map((template) => (template.id === saved.id ? saved : template));
    });

    return saved;
  }

  function deactivateKpiAreaTemplate(id) {
    setKpiAreaTemplates((current) =>
      current.map((template) => (template.id === id ? { ...template, estado: "Inactivo" } : template))
    );
  }

  function toggleKpiAreaTemplateStatus(id) {
    setKpiAreaTemplates((current) =>
      current.map((template) =>
        template.id === id
          ? {
              ...template,
              estado: template.estado === "Inactivo" ? "Activo" : "Inactivo",
              updatedAt: new Date().toISOString(),
            }
          : template
      )
    );
  }

  function deleteKpiAreaTemplate(id) {
    setKpiAreaTemplates((current) => current.filter((template) => template.id !== id));
  }

  function resetOnlyKpiTemplates() {
    const nextTemplates = initialKpiAreaTemplates.map((template) => withCurrentCompany(normalizeTemplate(template)));
    resetKpiTemplatesOnly(nextTemplates);
    setKpiAreaTemplates(nextTemplates);
    return nextTemplates;
  }

  function upsertKpiMonthlyEvaluation(record) {
    const normalized = normalizeMonthlyEvaluation({
      ...record,
      createdByUserId: record.createdByUserId || activeUser?.id || "",
      createdByName: record.createdByName || activeUser?.nombre || "",
      createdByRole: record.createdByRole || activeUser?.rol || "",
      evaluadorId: record.evaluadorId || activeUser?.id || "",
      evaluadorNombre: record.evaluadorNombre || activeUser?.nombre || "",
      evaluadorRol: record.evaluadorRol || activeUser?.rol || "",
      createdAt: record.createdAt || new Date().toISOString(),
    });
    const saved = withCurrentCompany({ ...normalized, id: normalized.id || createId("KPM") });

    setKpiMonthlyEvaluations((current) => {
      const exists = current.some((evaluation) => evaluation.id === saved.id);
      if (!exists) return [...current, saved];
      return current.map((evaluation) => (evaluation.id === saved.id ? saved : evaluation));
    });

    return saved;
  }

  function upsertKpiDailyRecord(record) {
    const normalized = normalizeDailyKpiRecord(record, activeUser, colaboradores, areas, encargados);
    const saved = withCurrentCompany({ ...normalized, id: normalized.id || createId("KPD") });
    setKpiDailyRecords((current) => upsertListItem(current, "KPD", saved));
    return saved;
  }

  function upsertVacationRecord(record) {
    const normalized = normalizeVacationRecord(record, activeUser, colaboradores, areas, encargados);
    const saved = withCurrentCompany({ ...normalized, id: normalized.id || createId("VAC") });
    setVacacionesRecords((current) => upsertListItem(current, "VAC", saved));
    return saved;
  }

  function upsertPermitRecord(record) {
    const normalized = normalizePermitRecord(record, activeUser, colaboradores, areas, encargados);
    const saved = withCurrentCompany({ ...normalized, id: normalized.id || createId("PER") });
    setPermisosRecords((current) => upsertListItem(current, "PER", saved));
    return saved;
  }

  function upsertWarningRecord(record) {
    const normalized = normalizeWarningRecord(record, activeUser, colaboradores, areas, encargados);
    const saved = withCurrentCompany({ ...normalized, id: normalized.id || createId("AMO") });
    setAmonestacionesRecords((current) => upsertListItem(current, "AMO", saved));
    return saved;
  }

  function renderView() {
    const fallbackView = isSuperadmin(activeUser) ? "superadminPanel" : "dashboard";
    const effectiveView = canUseView(view) ? view : fallbackView;

    switch (effectiveView) {
      case "superadminPanel":
        return (
          <SuperadminPanel
            activeUser={activeUser}
            onNavigate={setView}
            companies={companies}
            usuarios={usuarios}
            configuracion={safeConfig}
            onSaveCompany={upsertCompany}
            onCreateInitialCompanyManager={createInitialCompanyManager}
            onChangeUserPassword={changeUserPassword}
          />
        );
      case "empresasSucursales":
        return (
          <SuperadminPanel
            activeUser={activeUser}
            onNavigate={setView}
            companies={companies}
            usuarios={usuarios}
            configuracion={safeConfig}
            onSaveCompany={upsertCompany}
            onCreateInitialCompanyManager={createInitialCompanyManager}
            onChangeUserPassword={changeUserPassword}
            focusSection="companies"
          />
        );
      case "areas":
        return (
          <Areas
            areas={visibleAreas}
            areaSummary={areaSummary}
            encargados={visibleEncargados}
            subgerentes={visibleSubgerentes}
            canCreate={canManageCatalogs}
            canEdit={canManageCatalogs}
            onSave={upsertArea}
          />
        );
      case "encargados":
        return (
          <Encargados
            encargados={visibleEncargados}
            areas={visibleAreas}
            subgerentes={visibleSubgerentes}
            colaboradores={visibleColaboradores}
            encargadoSummary={encargadoSummary}
            canCreate={canManageCatalogs}
            canEdit={canManageCatalogs}
            onSave={upsertEncargado}
          />
        );
      case "colaboradores":
        return (
          <Colaboradores
            colaboradores={visibleColaboradores}
            areas={visibleAreas}
            encargados={visibleEncargados}
            kpiTemplates={visibleKpiAreaTemplates}
            activeUser={activeUser}
            canCreate={canManageCatalogs}
            canEdit={canManageCatalogs}
            onSave={upsertColaborador}
          />
        );
      case "evaluaciones":
        return (
          <Evaluaciones
            evaluaciones={visibleEvaluaciones}
            evaluacionesSubgerente={visibleEvaluacionesSubgerente}
            colaboradores={visibleColaboradores}
            encargados={visibleEncargados}
            areas={visibleAreas}
            subgerentes={visibleSubgerentes}
            activeUser={activeUser}
            canCreate={false}
            onCreateColaborador={(record) => addRecord(setEvaluaciones, "EVAL", record)}
            onCreateSubgerente={(record) => addRecord(setEvaluacionesSubgerente, "ESUB", record)}
          />
        );
      case "evaluacionEncargados":
        return (
          <EvaluacionEncargados
            evaluaciones={visibleEvaluacionesEncargado}
            encargados={visibleEncargados}
            areaSummary={areaSummary}
            monthlyKpi={visibleKpiMonthlyEvaluations}
            activeUser={activeUser}
            onCreateEvaluation={(record) => addRecord(setEvaluacionesEncargado, "EENC", record)}
          />
        );
      case "evaluacionSubgerentes":
        return (
          <EvaluacionSubgerentes
            evaluaciones={visibleEvaluacionesSubgerente}
            subgerentes={visibleSubgerentes}
            subgerenteSummary={subgerenteSummary}
            activeUser={activeUser}
            onCreateEvaluation={(record) => addRecord(setEvaluacionesSubgerente, "ESUB", record)}
          />
        );
      case "evaluacionTrimestral":
        return (
          <EvaluacionTrimestral
            evaluaciones={visibleEvaluacionesTrimestrales}
            colaboradores={visibleColaboradores}
            quarterlyTargets={quarterlyTargets}
            targetType={quarterlyTargetType}
            activeUser={activeUser}
            scopeAreas={quarterlyScopeAreas}
            startNewSignal={quarterlyStartSignal}
            supermarketName={safeConfig.nombreSupermercado}
            onSaveEvaluation={upsertQuarterlyEvaluation}
          />
        );
      case "plantillasKpiArea":
        return (
          <PlantillasKpiArea
            templates={visibleKpiAreaTemplates}
            areas={visibleAreas}
            activeUser={activeUser}
            onSaveTemplate={upsertKpiAreaTemplate}
            onDeactivateTemplate={deactivateKpiAreaTemplate}
            onToggleTemplateStatus={toggleKpiAreaTemplateStatus}
            onDeleteTemplate={deleteKpiAreaTemplate}
            onResetTemplates={resetOnlyKpiTemplates}
          />
        );
      case "evaluacionKpiMensual":
        return (
          <EvaluacionKpiMensual
            evaluaciones={visibleKpiMonthlyEvaluations}
            templates={visibleKpiAreaTemplates}
            colaboradores={visibleColaboradores}
            dailyRecords={visibleKpiDailyRecords}
            activeUser={activeUser}
            onSaveEvaluation={upsertKpiMonthlyEvaluation}
          />
        );
      case "kpiDiario":
        return (
          <KpiDiario
            records={visibleKpiDailyRecords}
            colaboradores={visibleColaboradores}
            areas={visibleAreas}
            encargados={visibleEncargados}
            templates={visibleKpiAreaTemplates}
            activeUser={activeUser}
            onSaveRecord={upsertKpiDailyRecord}
          />
        );
      case "analisisMovimientoProductos":
        return <AnalisisMovimientoProductos activeUser={activeUser} />;
      case "trasladosPendientes":
        return <TrasladosPendientes activeUser={activeUser} onBack={() => setView("dashboard")} />;
      case "vacaciones":
        return (
          <Vacaciones
            records={visibleVacacionesRecords}
            colaboradores={visibleColaboradores}
            areas={visibleAreas}
            encargados={visibleEncargados}
            activeUser={activeUser}
            onSaveRecord={upsertVacationRecord}
          />
        );
      case "permisos":
        return (
          <Permisos
            records={visiblePermisosRecords}
            colaboradores={visibleColaboradores}
            areas={visibleAreas}
            encargados={visibleEncargados}
            activeUser={activeUser}
            configuracion={safeConfig}
            onSaveRecord={upsertPermitRecord}
          />
        );
      case "amonestaciones":
        return (
          <Amonestaciones
            records={visibleAmonestacionesRecords}
            colaboradores={visibleColaboradores}
            areas={visibleAreas}
            encargados={visibleEncargados}
            activeUser={activeUser}
            onSaveRecord={upsertWarningRecord}
          />
        );
      case "incidencias":
        return (
          <Incidencias
            incidencias={visibleIncidencias}
            areas={visibleAreas}
            colaboradores={visibleColaboradores}
            canCreate={canCreateOperational}
            onCreate={(record) => addRecord(setIncidencias, "INC", record)}
          />
        );
      case "subgerentes":
        return (
          <Subgerentes
            subgerentes={visibleSubgerentes}
            subgerenteSummary={subgerenteSummary}
            areas={visibleAreas}
            usuarios={companyUsuarios}
            canCreate={canCreateSubgerentes(activeUser)}
            canEdit={canManageCatalogs}
            onSave={upsertSubgerente}
          />
        );
      case "gerentes":
        return (
          <Gerentes
            gerentes={visibleGerentes}
            canCreate={canManageCatalogs}
            onCreate={(record) => addRecord(setGerentes, "GER", record)}
          />
        );
      case "usuarios-roles":
        return (
          <UsuariosRoles
            usuarios={visibleUsuarios}
            areas={isSuperadmin(activeUser) ? areas : visibleAreas}
            encargados={isSuperadmin(activeUser) ? encargados : visibleEncargados}
            subgerentes={isSuperadmin(activeUser) ? subgerentes : visibleSubgerentes}
            colaboradores={isSuperadmin(activeUser) ? colaboradores : visibleColaboradores}
            activeUser={activeUser}
            canCreate={canCreateUsers(activeUser)}
            onSave={upsertUser}
            onToggleStatus={toggleUserStatus}
            onResetOperationalData={confirmOperationalReset}
          />
        );
      case "reportes":
        return <Reportes activeUser={activeUser} />;
      case "configuracion":
        return (
          <Configuracion
            configuracion={safeConfig}
            areas={isSuperadmin(activeUser) ? areas : visibleAreas}
            canView={canAccessSettings(activeUser)}
            onSave={setConfiguracion}
            onBack={() => setView("dashboard")}
          />
        );
      case "dashboard":
      default:
        return (
          <Dashboard
            kpiGeneral={kpiGeneral}
            areaSummary={areaSummary}
            colaboradores={visibleColaboradores}
            evaluaciones={visibleMonthlyDashboardRows}
            evaluacionesTrimestrales={visibleEvaluacionesTrimestrales}
            incidencias={visibleIncidencias}
            topColaboradores={topColaboradores}
            tendencia={initialData.tendencia}
            activeUser={activeUser}
            configuracion={safeConfig}
            canCreateQuarterly={canCreateQuarterlyEvaluation(activeUser)}
            onNewQuarterlyEvaluation={openNewQuarterlyEvaluationFromDashboard}
          />
        );
    }
  }

  if (!activeUser) {
    return <Login supermarketName={safeConfig.nombreSupermercado} onLogin={login} />;
  }

  const effectiveView = canUseView(view) ? view : isSuperadmin(activeUser) ? "superadminPanel" : "dashboard";
  const effectiveModuleLabel = MODULES.find((module) => module.id === effectiveView)?.label || "Dashboard";

  return (
    <div
      className={`app-shell ${sidebarCollapsed ? "is-sidebar-collapsed" : ""} ${safeConfig.visual.tema === "Oscuro" ? "theme-dark" : ""} ${safeConfig.visual.vista === "Compacta" ? "theme-compact" : ""}`}
      style={{ "--primary": safeConfig.visual.colorPrincipal, "--secondary": safeConfig.visual.colorSecundario }}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        modules={modules}
        activeView={effectiveView}
        onNavigate={setView}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        supermarketName={safeConfig.nombreSupermercado}
        logoDataUrl={safeConfig.logoDataUrl}
      />

      <main className="main-shell">
        <Topbar
          activeLabel={effectiveModuleLabel}
          activeUser={activeUser}
          supermarketName={safeConfig.nombreSupermercado}
          onLogout={logout}
        />
        <div className="workspace">{renderView()}</div>
      </main>
    </div>
  );
}

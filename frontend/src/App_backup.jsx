import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";


const API_URL = "http://127.0.0.1:8000";


function App() {

  const [stats, setStats] = useState({
    total_reports: 0,
    sif_yes: 0,
    sif_no: 0,
    high_confidence_sif: 0,
    life_saving_rules: {},
    precursor_activities: {},
  });

  const [reports, setReports] = useState([]);

  const [reportText, setReportText] = useState("");

  const [analysis, setAnalysis] = useState(null);

  const [loading, setLoading] = useState(false);

  const [loadingData, setLoadingData] = useState(false);

  const [error, setError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);


  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  const loadDashboard = async () => {

    try {

      setLoadingData(true);
      setError("");

      const [statsResponse, reportsResponse] =
        await Promise.all([
          fetch(`${API_URL}/dashboard/stats`),
          fetch(`${API_URL}/reports`),
        ]);

      if (!statsResponse.ok) {
        throw new Error("Dashboard statistics API failed");
      }

      if (!reportsResponse.ok) {
        throw new Error("Reports API failed");
      }

      const statsData = await statsResponse.json();

      const reportsData = await reportsResponse.json();

      setStats(statsData);

      setReports(reportsData);

    } catch (error) {

      console.error(error);

      setError(
        "Backend se connection nahi ho raha. FastAPI server check karo."
      );

    } finally {

      setLoadingData(false);

    }
  };


  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {

    loadDashboard();

  }, []);


  // =====================================================
  // ANALYZE REPORT
  // =====================================================

  const analyzeReport = async () => {

    if (!reportText.trim()) {

      setError(
        "Please safety report enter karo."
      );

      return;
    }

    try {

      setLoading(true);

      setError("");

      setAnalysis(null);

      const response = await fetch(
        `${API_URL}/analyze`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            report_text: reportText,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {

        throw new Error(
          data.detail || "Report analysis failed"
        );

      }

      setAnalysis(data);

      setReportText("");

      await loadDashboard();

    } catch (error) {

      console.error(error);

      setError(
        error.message || "Report analysis failed."
      );

    } finally {

      setLoading(false);

    }
  };


  // =====================================================
  // CHART DATA
  // =====================================================

  const sifChartData = [
    {
      name: "SIF YES",
      value: stats.sif_yes || 0,
    },
    {
      name: "SIF NO",
      value: stats.sif_no || 0,
    },
  ];


  const ruleChartData = Object.entries(
    stats.life_saving_rules || {}
  ).map(([name, value]) => ({
    name,
    value,
  }));


  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDate = (date) => {

    if (!date) {
      return "-";
    }

    try {

      return new Date(date).toLocaleString(
        "en-IN",
        {
          dateStyle: "short",
          timeStyle: "short",
        }
      );

    } catch {

      return "-";

    }
  };


  return (

    <div className="min-h-screen bg-slate-50 text-slate-900">


      {/* =================================================
          MOBILE OVERLAY
      ================================================= */}

      {sidebarOpen && (

        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />

      )}


      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          h-screen
          w-72
          bg-slate-950
          text-white
          transition-transform
          duration-300
          lg:translate-x-0
          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >

        <div className="flex h-full flex-col">


          {/* LOGO */}

          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-6">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500">

                <ShieldAlert size={24} />

              </div>

              <div>

                <h1 className="text-lg font-bold">
                  SIF-Sanket
                </h1>

                <p className="text-xs text-slate-400">
                  Safety Intelligence
                </p>

              </div>

            </div>


            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >

              <X size={22} />

            </button>

          </div>


          {/* NAVIGATION */}

          <nav className="flex-1 space-y-2 px-4 py-6">

            <NavItem
              icon={<LayoutDashboard size={19} />}
              text="Dashboard"
              active
            />

            <NavItem
              icon={<ClipboardList size={19} />}
              text="Safety Reports"
            />

            <NavItem
              icon={<ShieldAlert size={19} />}
              text="SIF Precursors"
            />

            <NavItem
              icon={<BarChart3 size={19} />}
              text="Analytics"
            />

          </nav>


          {/* SYSTEM STATUS */}

          <div className="m-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">

            <div className="mb-3 flex items-center gap-2">

              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

              <span className="text-sm font-medium">
                System Online
              </span>

            </div>

            <p className="text-xs leading-5 text-slate-400">
              XLM-RoBERTa AI engine and PostgreSQL
              database connected.
            </p>

          </div>

        </div>

      </aside>


      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="lg:ml-72">


        {/* HEADER */}

        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">

          <div className="flex h-20 items-center justify-between px-5 sm:px-8">


            <div className="flex items-center gap-4">

              <button
                className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >

                <Menu size={24} />

              </button>


              <div>

                <h2 className="text-xl font-bold">
                  SIF Safety Dashboard
                </h2>

                <p className="hidden text-sm text-slate-500 sm:block">
                  AI-powered Serious Injury & Fatality
                  precursor analysis
                </p>

              </div>

            </div>


            <button
              onClick={loadDashboard}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50"
            >

              <RefreshCw
                size={16}
                className={
                  loadingData
                    ? "animate-spin"
                    : ""
                }
              />

              <span className="hidden sm:inline">
                Refresh
              </span>

            </button>

          </div>

        </header>


        {/* PAGE */}

        <div className="p-5 sm:p-8">


          {/* ERROR */}

          {error && (

            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">

              <AlertTriangle
                size={20}
                className="mt-0.5"
              />

              <div className="flex-1 text-sm">
                {error}
              </div>

              <button
                onClick={() => setError("")}
              >

                <X size={18} />

              </button>

            </div>

          )}


          {/* =================================================
              STATISTICS
          ================================================= */}

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">


            <StatCard
              title="Total Reports"
              value={stats.total_reports}
              icon={<FileText size={22} />}
              iconClass="bg-blue-100 text-blue-600"
            />


            <StatCard
              title="SIF Potential"
              value={stats.sif_yes}
              subtitle="YES"
              icon={<ShieldAlert size={22} />}
              iconClass="bg-red-100 text-red-600"
              valueClass="text-red-600"
            />


            <StatCard
              title="No SIF Potential"
              value={stats.sif_no}
              subtitle="NO"
              icon={<ShieldCheck size={22} />}
              iconClass="bg-emerald-100 text-emerald-600"
              valueClass="text-emerald-600"
            />


            <StatCard
              title="High Confidence SIF"
              value={stats.high_confidence_sif}
              subtitle="≥ 90%"
              icon={<Brain size={22} />}
              iconClass="bg-purple-100 text-purple-600"
              valueClass="text-purple-600"
            />

          </div>


          {/* =================================================
              ANALYZE REPORT
          ================================================= */}

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">


            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">

                    <Brain size={21} />

                  </div>

                  <h3 className="text-lg font-bold">
                    Analyze Safety Report
                  </h3>

                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Enter a safety observation and let
                  the XLM-R AI engine identify potential
                  SIF precursors.
                </p>

              </div>


              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">

                <Activity size={15} />

                AI Engine Active

              </div>

            </div>


            <textarea
              value={reportText}
              onChange={(e) =>
                setReportText(e.target.value)
              }
              placeholder="Example: A worker entered a confined space without completing gas testing and without a valid entry permit."
              rows={5}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
            />


            <div className="mt-4 flex justify-end">

              <button
                onClick={analyzeReport}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {loading ? (

                  <>
                    <RefreshCw
                      size={17}
                      className="animate-spin"
                    />

                    Analyzing...

                  </>

                ) : (

                  <>
                    Analyze Report

                    <ChevronRight size={17} />

                  </>

                )}

              </button>

            </div>

          </section>


          {/* =================================================
              AI RESULT
          ================================================= */}

          {analysis && (

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">


              <div className="mb-5 flex items-center justify-between">

                <div>

                  <h3 className="text-lg font-bold">
                    AI Analysis Result
                  </h3>

                  <p className="text-sm text-slate-500">
                    Report ID #{analysis.report_id}
                  </p>

                </div>


                <div
                  className={`
                    rounded-full
                    px-4
                    py-2
                    text-sm
                    font-bold
                    ${
                      analysis.sif_prediction === "YES"
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    }
                  `}
                >

                  SIF {analysis.sif_prediction}

                </div>

              </div>


              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <ResultItem
                  label="Confidence"
                  value={
                    `${(
                      analysis.confidence * 100
                    ).toFixed(2)}%`
                  }
                />

                <ResultItem
                  label="Life-Saving Rule"
                  value={
                    analysis.life_saving_rule
                  }
                />

                <ResultItem
                  label="Activity"
                  value={
                    analysis.precursor_activity
                  }
                />

                <ResultItem
                  label="Location"
                  value={
                    analysis.precursor_location
                  }
                />

              </div>


              <div className="mt-4 rounded-2xl bg-slate-50 p-4">

                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Barrier Failure
                </p>

                <p className="text-sm text-slate-700">
                  {analysis.barrier_failure ||
                    "Not identified"}
                </p>

              </div>

            </section>

          )}


          {/* =================================================
              CHARTS
          ================================================= */}

          <div className="mt-6 grid gap-6 xl:grid-cols-2">


            {/* SIF CHART */}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

              <div className="mb-5">

                <h3 className="font-bold">
                  SIF Distribution
                </h3>

                <p className="text-sm text-slate-500">
                  SIF potential across analyzed reports
                </p>

              </div>


              <div className="h-72">

                {stats.total_reports > 0 ? (

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <PieChart>

                      <Pie
                        data={sifChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                      >

                        <Cell fill="#ef4444" />

                        <Cell fill="#10b981" />

                      </Pie>

                      <Tooltip />

                      <Legend />

                    </PieChart>

                  </ResponsiveContainer>

                ) : (

                  <EmptyChart />

                )}

              </div>

            </section>


            {/* LIFE SAVING RULE CHART */}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

              <div className="mb-5">

                <h3 className="font-bold">
                  Life-Saving Rules
                </h3>

                <p className="text-sm text-slate-500">
                  Detected safety-critical categories
                </p>

              </div>


              <div className="h-72">

                {ruleChartData.length > 0 ? (

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <BarChart
                      data={ruleChartData}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="name"
                        tick={{
                          fontSize: 11,
                        }}
                      />

                      <YAxis
                        allowDecimals={false}
                      />

                      <Tooltip />

                      <Bar
                        dataKey="value"
                        fill="#0891b2"
                        radius={[
                          7,
                          7,
                          0,
                          0,
                        ]}
                      />

                    </BarChart>

                  </ResponsiveContainer>

                ) : (

                  <EmptyChart />

                )}

              </div>

            </section>

          </div>


          {/* =================================================
              REPORT TABLE
          ================================================= */}

          <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">


            <div className="flex items-center justify-between border-b border-slate-200 p-5 sm:p-7">

              <div>

                <h3 className="font-bold">
                  Recent Safety Reports
                </h3>

                <p className="text-sm text-slate-500">
                  Latest reports processed by SIF-Sanket
                </p>

              </div>


              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">

                {reports.length} reports

              </span>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full min-w-[950px] text-left">


                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">

                  <tr>

                    <th className="px-5 py-4">
                      ID
                    </th>

                    <th className="px-5 py-4">
                      Report
                    </th>

                    <th className="px-5 py-4">
                      SIF
                    </th>

                    <th className="px-5 py-4">
                      Confidence
                    </th>

                    <th className="px-5 py-4">
                      Life-Saving Rule
                    </th>

                    <th className="px-5 py-4">
                      Activity
                    </th>

                    <th className="px-5 py-4">
                      Date
                    </th>

                  </tr>

                </thead>


                <tbody className="divide-y divide-slate-100">


                  {reports.length === 0 ? (

                    <tr>

                      <td
                        colSpan="7"
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >

                        No reports available.

                      </td>

                    </tr>

                  ) : (

                    reports
                      .slice(0, 10)
                      .map((report) => (

                        <tr
                          key={report.report_id}
                          className="transition hover:bg-slate-50"
                        >


                          <td className="px-5 py-4 font-semibold text-slate-700">

                            #{report.report_id}

                          </td>


                          <td className="max-w-sm px-5 py-4">

                            <p className="truncate text-sm text-slate-700">

                              {report.raw_text}

                            </p>

                          </td>


                          <td className="px-5 py-4">

                            <span
                              className={`
                                rounded-full
                                px-3
                                py-1
                                text-xs
                                font-bold
                                ${
                                  report.sif_prediction ===
                                  "YES"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }
                              `}
                            >

                              {report.sif_prediction}

                            </span>

                          </td>


                          <td className="px-5 py-4 text-sm font-medium">

                            {report.confidence != null
                              ? `${(
                                  report.confidence *
                                  100
                                ).toFixed(2)}%`
                              : "-"}

                          </td>


                          <td className="px-5 py-4 text-sm text-slate-600">

                            {report.life_saving_rule ||
                              "-"}

                          </td>


                          <td className="px-5 py-4 text-sm text-slate-600">

                            {report.precursor_activity ||
                              "-"}

                          </td>


                          <td className="px-5 py-4 text-xs text-slate-500">

                            {formatDate(
                              report.created_at
                            )}

                          </td>


                        </tr>

                      ))

                  )}

                </tbody>

              </table>

            </div>

          </section>


          {/* FOOTER */}

          <footer className="py-8 text-center text-xs text-slate-400">

            SIF-Sanket • AI-powered Safety Intelligence Platform

          </footer>


        </div>

      </main>

    </div>
  );
}


// =========================================================
// NAV ITEM
// =========================================================

function NavItem({
  icon,
  text,
  active = false,
}) {

  return (

    <div
      className={`
        flex
        items-center
        gap-3
        rounded-xl
        px-4
        py-3
        ${
          active
            ? "bg-cyan-500/15 text-cyan-400"
            : "text-slate-400 hover:bg-slate-900 hover:text-white"
        }
      `}
    >

      {icon}

      <span className="font-medium">
        {text}
      </span>

    </div>

  );
}


// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
  valueClass = "text-slate-900",
}) {

  return (

    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">


      <div className="flex items-start justify-between">


        <div>

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>


          <div className="mt-2 flex items-baseline gap-2">

            <span
              className={`text-3xl font-bold ${valueClass}`}
            >
              {value}
            </span>

            {subtitle && (

              <span className="text-xs font-semibold text-slate-400">
                {subtitle}
              </span>

            )}

          </div>

        </div>


        <div
          className={`
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            ${iconClass}
          `}
        >

          {icon}

        </div>

      </div>

    </div>

  );

}


// =========================================================
// RESULT ITEM
// =========================================================

function ResultItem({
  label,
  value,
}) {

  return (

    <div className="rounded-2xl border border-slate-200 bg-white p-4">

      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-slate-800">
        {value || "Not identified"}
      </p>

    </div>

  );

}


// =========================================================
// EMPTY CHART
// =========================================================

function EmptyChart() {

  return (

    <div className="flex h-full items-center justify-center">

      <div className="text-center">

        <BarChart3
          size={35}
          className="mx-auto text-slate-300"
        />

        <p className="mt-2 text-sm text-slate-400">
          No data available
        </p>

      </div>

    </div>

  );

}


export default App;
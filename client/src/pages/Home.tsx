import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { startLogin } from "@/const";
import { motion } from "framer-motion";
import {
  Search, Clock, Sparkles,
  Zap, Target, BrainCircuit, Download, Database, Globe, ArrowRight
} from "lucide-react";

const features = [
  {
    title: "Fast & Accurate",
    description: "Extract data from hundreds of pages in seconds. Our engine runs parallel tasks to ensure you get data as quickly as possible.",
    icon: Zap,
  },
  {
    title: "Location Targeting",
    description: "Laser-focused search capabilities. Target specific cities, states, or regions across India with pin-point accuracy.",
    icon: Target,
  },
  {
    title: "AI-Powered",
    description: "Not sure what to search? Upload your brochure and our AI will automatically determine your perfect target audience.",
    icon: BrainCircuit,
  },
  {
    title: "Export Ready",
    description: "Download your data in clean, formatted CSV or Excel files immediately ready for import into your CRM.",
    icon: Download,
  }
];

const stats = [
  { label: "Business Categories", count: "1,500+", icon: Database },
  { label: "Indian Cities Covered", count: "500+", icon: Globe },
  { label: "Data Points Extracted", count: "10+", icon: Target },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 70, damping: 20 } },
};

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-[100dvh] pb-24 space-y-12 pt-8">

      {/* Hero & Stats Section Wrapped in Hero Glass Panel (#FFFFFF) */}
      <section className="px-4 md:px-8">
        <div className="max-w-[1400px] mx-auto bg-white/70 backdrop-blur-[32px] border border-white/80 shadow-[0_30px_90px_rgba(70,90,220,0.05)] rounded-[40px] p-8 md:p-16 lg:p-24 relative overflow-hidden">

          <motion.div
            initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto text-center mb-24"
          >
            <h1 className="text-5xl lg:text-[5.5rem] font-bold tracking-tighter text-slate-900 mb-8 leading-[1.05]">
              Discover & Verify
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-[#465ADC] to-slate-900">Business Data Instantly</span>
            </h1>

            <p className="text-xl lg:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              Tap into our intelligent data network to extract, verify, and organize premium B2B contacts across India in real-time.
            </p>

            <div className="flex justify-center">
              <Button
                size="lg"
                className="h-14 px-10 text-lg font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_25px_50px_-15px_rgba(0,0,0,0.4)]"
                onClick={() => {
                  if (isAuthenticated) {
                    window.location.href = "/search";
                  } else {
                    startLogin();
                  }
                }}
              >
                Start Data Extraction
                <ArrowRight className="w-5 h-5 ml-2 opacity-80" />
              </Button>
            </div>
          </motion.div>

          {/* Stats inside Hero Panel */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          >
            {stats.map((item, i) => (
              <motion.div key={i} variants={itemVariants}>
                <Card className="bg-white/80 border border-gray-200/50 rounded-[2rem] p-8 text-center shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-500">
                  <div className="w-12 h-12 mx-auto bg-[#F6F8FF] text-[#465ADC] rounded-full flex items-center justify-center mb-6 border border-indigo-100">
                    <item.icon className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 text-3xl tracking-tight">{item.count}</h3>
                  <p className="text-slate-500 font-medium text-sm">{item.label}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section Glass Panel (#FAFBFF) */}
      <section className="px-4 md:px-8">
        <div className="max-w-[1400px] mx-auto bg-[#FAFBFF]/70 backdrop-blur-[32px] border border-white/80 shadow-[0_30px_90px_rgba(70,90,220,0.05)] rounded-[40px] p-8 md:p-16 lg:p-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Intelligent Architecture</h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto font-light">A suite of powerful extraction and verification tools designed for scale.</p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={itemVariants}>
                <Card className="bg-white/90 p-8 h-full border border-gray-200/50 shadow-sm rounded-[2rem] hover:-translate-y-1 hover:shadow-md transition-all duration-500 group">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#F6F8FF] border border-indigo-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-500">
                        <feature.icon className="w-5 h-5 text-[#465ADC] stroke-[1.5]" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-2 text-xl tracking-tight">{feature.title}</h3>
                      <p className="text-slate-500 leading-relaxed font-light">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works Section Glass Panel (#F6F8FF) */}
      <section className="px-4 md:px-8">
        <div className="max-w-[1400px] mx-auto bg-[#F6F8FF]/70 backdrop-blur-[32px] border border-white/80 shadow-[0_30px_90px_rgba(70,90,220,0.05)] rounded-[40px] p-8 md:p-16 lg:p-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-6 tracking-tight">Data Flow Process</h2>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto relative"
          >
            <div className="hidden md:block absolute top-6 left-[15%] w-[70%] h-[1px] bg-gradient-to-r from-transparent via-indigo-200 to-transparent z-0" />

            <motion.div variants={itemVariants} className="flex flex-col items-center relative z-10">
              <div className="w-12 h-12 rounded-full bg-white text-slate-900 font-bold text-lg flex items-center justify-center mb-6 border border-gray-200 shadow-sm">1</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Input Parameters</h3>
              <p className="text-slate-500 font-light leading-relaxed text-center">Define specific industry verticals and geographic boundaries for the AI to target.</p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col items-center relative z-10">
              <div className="w-12 h-12 rounded-full bg-[#465ADC] text-white font-bold text-lg flex items-center justify-center mb-6 shadow-md shadow-indigo-500/20">2</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Network Extraction</h3>
              <p className="text-slate-500 font-light leading-relaxed text-center">The engine queries multiple verified sources concurrently, validating contact data.</p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col items-center relative z-10">
              <div className="w-12 h-12 rounded-full bg-white text-slate-900 font-bold text-lg flex items-center justify-center mb-6 border border-gray-200 shadow-sm">3</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">CRM Integration</h3>
              <p className="text-slate-500 font-light leading-relaxed text-center">Export standardized, clean data packages ready for immediate outreach deployment.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Search / Dashboard Section Glass Panel (#FFFFFF) */}
      <section className="px-4 md:px-8">
        <div className="max-w-[1400px] mx-auto bg-white/70 backdrop-blur-[32px] border border-white/80 shadow-[0_30px_90px_rgba(70,90,220,0.05)] rounded-[40px] p-8 md:p-16 lg:p-24">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          >
            {/* Primary Action */}
            <motion.div variants={itemVariants} className="md:col-span-2">
              <Card className="h-full bg-slate-900 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 group overflow-hidden relative cursor-pointer rounded-[2rem] border-0" onClick={() => window.location.href = "/search"}>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="p-10 lg:p-14 relative z-10 flex flex-col h-full justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-8 backdrop-blur-sm group-hover:scale-105 transition-transform duration-500">
                    <Search className="w-6 h-6 text-white stroke-[1.5]" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">Initiate Extraction</h3>
                    <p className="text-slate-300 text-lg font-light">Deploy the AI scanner across specific Indian regions to compile verified business datasets.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Secondary Actions */}
            <motion.div variants={itemVariants} className="flex flex-col gap-8 h-full">
              <Card className="bg-white flex-1 p-8 border border-gray-200/50 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-500 rounded-[2rem] cursor-pointer group" onClick={() => window.location.href = "/results"}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#F6F8FF] border border-indigo-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-500">
                    <Clock className="w-5 h-5 text-[#465ADC] stroke-[1.5]" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg mb-1 tracking-tight">Data Logs</h4>
                  <p className="text-sm text-slate-500 font-light">Access previously extracted databases</p>
                </div>
              </Card>

              <Card className="bg-white p-8 border border-gray-200/50 shadow-sm rounded-[2rem]">
                <h4 className="font-semibold text-slate-900 text-sm uppercase tracking-wider mb-5">Frequent Queries</h4>
                <div className="flex flex-wrap gap-2">
                  {["Software", "Manufacturing", "Healthcare", "Logistics"].map(tag => (
                    <button key={tag} className="h-9 px-4 rounded-full text-xs font-medium border border-gray-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all">
                      {tag}
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}

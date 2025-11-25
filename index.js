import React, { useState, useEffect } from 'react';
import { 
  Menu, X, ArrowRight, Shield, Music, Zap, Bot, MessageSquare, 
  Github, Twitter, ExternalLink, ChevronDown, LayoutDashboard, 
  Settings, Users, Activity, LogOut, Save, Volume2, AlertTriangle 
} from 'lucide-react';

export default function App() {
  // State to switch between Landing Page and Dashboard
  const [currentView, setCurrentView] = useState('landing'); // 'landing' or 'dashboard'

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-pink-600 selection:text-white">
      {currentView === 'landing' ? (
        <LandingPage onLogin={() => setCurrentView('dashboard')} />
      ) : (
        <Dashboard onLogout={() => setCurrentView('landing')} />
      )}
    </div>
  );
}

// --- LANDING PAGE COMPONENT ---
function LandingPage({ onLogin }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Features', href: '#features' },
    { name: 'Commands', href: '#commands' },
  ];

  return (
    <>
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-zinc-800 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(219,39,119,0.5)]">
              97
            </div>
            <span className="font-bold text-xl tracking-tight text-white">97s</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} className="text-sm font-medium text-zinc-400 hover:text-pink-500 transition-colors">
                {link.name}
              </a>
            ))}
            <button 
              onClick={onLogin}
              className="bg-zinc-100 text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-pink-600 hover:text-white transition-all shadow-lg hover:shadow-pink-600/20"
            >
              Dashboard
            </button>
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-zinc-400 hover:text-white">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-zinc-900 border-b border-zinc-800 p-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} onClick={() => setIsMenuOpen(false)} className="text-lg font-medium text-zinc-300 hover:text-pink-500 py-2">
                {link.name}
              </a>
            ))}
            <button onClick={onLogin} className="w-full bg-pink-600 text-white px-5 py-3 rounded-lg font-bold hover:bg-pink-700">
              Login
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 md:pt-48 md:pb-32 px-4 relative overflow-hidden">
        <div className="absolute top-20 right-0 -mr-20 w-96 h-96 bg-pink-900/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute top-40 left-0 -ml-20 w-72 h-72 bg-zinc-800/30 rounded-full blur-3xl -z-10"></div>

        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-pink-500 text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
            </span>
            System Online
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter mb-6 leading-tight">
            NEXT GEN <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-zinc-500">AUTOMATION</span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            97s provides the ultimate toolkit for your community. 
            Advanced moderation, high-fidelity music, and seamless management in one dark-themed package.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onLogin} className="w-full sm:w-auto px-8 py-4 bg-pink-600 text-white rounded-full font-bold text-lg hover:bg-pink-700 transition-all shadow-[0_0_20px_rgba(219,39,119,0.3)] flex items-center justify-center gap-2 group">
              Setup Bot
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-transparent text-white border border-zinc-700 rounded-full font-bold text-lg hover:bg-zinc-800 transition-all flex items-center justify-center">
              Documentation
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-black relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Shield size={32} className="text-pink-500" />}
              title="Sentinel Mode"
              description="Automated raid protection and anti-spam filters that adapt to your server's needs."
            />
            <FeatureCard 
              icon={<Music size={32} className="text-zinc-200" />}
              title="Audio Engine"
              description="Lossless audio streaming with bass boost, vaporwave filters, and 24/7 lo-fi support."
            />
            <FeatureCard 
              icon={<Zap size={32} className="text-pink-500" />}
              title="Rank Cards"
              description="Fully customizable rank cards with dark mode aesthetics and custom backgrounds."
            />
          </div>
        </div>
      </section>

       {/* Showcase Section */}
       <section id="commands" className="py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Command Center</h2>
              <p className="text-zinc-500">Sleek embeds and intuitive interactions.</p>
            </div>
            <a href="#" className="hidden md:flex items-center gap-2 text-pink-500 font-bold hover:text-pink-400">
              View all commands <ArrowRight size={16} />
            </a>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="group relative rounded-2xl overflow-hidden cursor-pointer border border-zinc-800 bg-zinc-900">
               <div className="h-64 bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 to-black"></div>
                  <div className="bg-black border border-zinc-800 p-6 rounded-lg shadow-2xl max-w-xs w-full relative z-10 transform group-hover:scale-105 transition-transform duration-500">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center">97</div>
                        <div>
                           <div className="text-white font-bold">97s</div>
                           <div className="text-xs text-zinc-500">BOT</div>
                        </div>
                     </div>
                     <div className="h-2 bg-zinc-800 rounded mb-2 w-3/4"></div>
                     <div className="h-2 bg-zinc-800 rounded mb-2 w-1/2"></div>
                     <div className="h-2 bg-zinc-800 rounded w-full"></div>
                  </div>
               </div>
               <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Embed Generator</h3>
                  <p className="text-zinc-500 text-sm">Create stunning messages visually.</p>
               </div>
            </div>

            <div className="group relative rounded-2xl overflow-hidden cursor-pointer border border-zinc-800 bg-zinc-900">
               <div className="h-64 bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-bl from-zinc-800/50 to-black"></div>
                  <div className="text-center z-10">
                     <div className="text-6xl font-black text-white mb-2">#1</div>
                     <div className="text-pink-500 font-bold tracking-widest uppercase text-sm">Leaderboard</div>
                  </div>
               </div>
               <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Competitive Leveling</h3>
                  <p className="text-zinc-500 text-sm">Gamify your server engagement.</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-black py-12 border-t border-zinc-900 text-center">
        <p className="text-zinc-600">&copy; 2025 97s Systems. All systems nominal.</p>
      </footer>
    </>
  );
}

// --- DASHBOARD COMPONENT ---
function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [toggleMusic, setToggleMusic] = useState(true);
  const [toggleMod, setToggleMod] = useState(true);

  const menuItems = [
    { id: 'overview', icon: <Activity size={20} />, label: 'Overview' },
    { id: 'modules', icon: <LayoutDashboard size={20} />, label: 'Modules' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
    { id: 'members', icon: <Users size={20} />, label: 'Members' },
  ];

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-900">
          <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center text-white font-bold shadow-[0_0_10px_rgba(219,39,119,0.5)]">
            97
          </div>
          <span className="font-bold text-lg text-white tracking-wide">97s Panel</span>
        </div>

        <div className="flex-1 py-6 px-4 space-y-2">
          <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-4 px-2">Main Menu</div>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id 
                  ? 'bg-pink-600/10 text-pink-500 border border-pink-600/20' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-900">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-black p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <p className="text-zinc-500 text-sm">Manage your bot settings and preferences.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-zinc-800">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-mono text-zinc-400">v2.4.0 STABLE</span>
             </div>
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold border border-zinc-700">
              AD
            </div>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="Total Servers" value="142" change="+12%" />
              <StatCard title="Active Members" value="12,405" change="+5%" />
              <StatCard title="Commands Used" value="843,291" change="+24%" />
            </div>

            {/* Recent Activity */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Live Activity Feed</h3>
              <div className="space-y-4">
                <ActivityRow user="Kylian" action="played a song" time="2 min ago" />
                <ActivityRow user="AutoMod" action="banned a user" time="15 min ago" />
                <ActivityRow user="Sarah" action="leveled up to Lvl 50" time="1 hour ago" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-600/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-pink-500">
                  <Music size={24} />
                </div>
                <Toggle checked={toggleMusic} onChange={() => setToggleMusic(!toggleMusic)} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 relative z-10">Music Player</h3>
              <p className="text-zinc-500 text-sm mb-4 relative z-10">High quality music playback from multiple sources with equalizer support.</p>
              <div className="flex gap-2 relative z-10">
                 <span className="px-2 py-1 bg-zinc-900 rounded text-xs text-zinc-400 border border-zinc-800">Spotify</span>
                 <span className="px-2 py-1 bg-zinc-900 rounded text-xs text-zinc-400 border border-zinc-800">SoundCloud</span>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-purple-500">
                  <Shield size={24} />
                </div>
                <Toggle checked={toggleMod} onChange={() => setToggleMod(!toggleMod)} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 relative z-10">Auto-Moderation</h3>
              <p className="text-zinc-500 text-sm mb-4 relative z-10">Proactive scanning of messages for spam, raid attempts, and toxicity.</p>
              <div className="flex gap-2 relative z-10">
                 <span className="px-2 py-1 bg-zinc-900 rounded text-xs text-zinc-400 border border-zinc-800">Anti-Spam</span>
                 <span className="px-2 py-1 bg-zinc-900 rounded text-xs text-zinc-400 border border-zinc-800">Filters</span>
              </div>
            </div>
            
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 opacity-50 cursor-not-allowed">
               <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-500">
                  <AlertTriangle size={24} />
                </div>
                <div className="px-2 py-1 bg-zinc-900 text-xs font-bold text-zinc-500 rounded border border-zinc-800">SOON</div>
              </div>
              <h3 className="text-xl font-bold text-zinc-500 mb-2">Economy</h3>
              <p className="text-zinc-600 text-sm">Global currency system with trading and shops.</p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
           <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 max-w-2xl">
              <h3 className="text-lg font-bold text-white mb-6">General Configuration</h3>
              <div className="space-y-6">
                 <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Bot Prefix</label>
                    <input type="text" defaultValue="!" className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Language</label>
                    <select className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-pink-500 outline-none">
                       <option>English (US)</option>
                       <option>Spanish</option>
                       <option>French</option>
                       <option>German</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Embed Color (Hex)</label>
                    <div className="flex gap-2">
                       <input type="color" defaultValue="#db2777" className="h-12 w-12 bg-transparent border-0 rounded cursor-pointer" />
                       <input type="text" defaultValue="#db2777" className="flex-1 bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white font-mono uppercase" />
                    </div>
                 </div>
                 <div className="pt-4 border-t border-zinc-900 flex justify-end">
                    <button className="flex items-center gap-2 bg-pink-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-pink-700 transition-colors">
                       <Save size={18} />
                       Save Changes
                    </button>
                 </div>
              </div>
           </div>
        )}

      </main>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-pink-900 hover:bg-zinc-900/80 transition-all duration-300 group">
      <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center border border-zinc-800 mb-6 group-hover:scale-110 group-hover:border-pink-500/30 transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StatCard({ title, value, change }) {
  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 hover:border-zinc-800 transition-colors">
      <p className="text-zinc-500 text-sm font-medium mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-3xl font-bold text-white">{value}</h3>
        <span className="text-green-500 text-sm font-bold bg-green-500/10 px-2 py-1 rounded">{change}</span>
      </div>
    </div>
  );
}

function ActivityRow({ user, action, time }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-900/50 transition-colors">
      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-white font-bold">
        {user.charAt(0)}
      </div>
      <div className="flex-1">
        <p className="text-sm text-zinc-300"><span className="font-bold text-white">{user}</span> {action}</p>
      </div>
      <span className="text-xs text-zinc-600">{time}</span>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button 
      onClick={onChange}
      className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${checked ? 'bg-pink-600' : 'bg-zinc-800'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );
}

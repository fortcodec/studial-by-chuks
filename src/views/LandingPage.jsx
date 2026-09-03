import React, { useState } from 'react';
import { BookOpen, LogIn, ArrowRight, Menu, X } from 'lucide-react';
import studentsImg from '../assets/students-collaborating.jpg';

export default function LandingPage({ navigateTo }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-background flex flex-col font-inter relative">
      
      {/* Navbar */}
      <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto w-full z-20">
        <div className="flex items-center gap-2 text-primary-navy">
          <BookOpen size={28} />
          <span className="font-bold text-xl tracking-tight">Studial</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600">
          <a href="#" className="hover:text-primary-navy transition-colors">Home</a>
          <a href="#about" className="hover:text-primary-navy transition-colors">About</a>
          <a href="#gist" className="hover:text-primary-navy transition-colors">Campus Gist</a>
          <a href="mailto:fchuksd42@gmail.com" className="hover:text-primary-navy transition-colors">Contact Developer</a>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button 
          className="md:hidden text-primary-navy p-2 hover:bg-gray-100 rounded-lg transition"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Dropdown Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white shadow-lg border-b border-gray-100 z-20 origin-top animate-in fade-in slide-in-from-top-5 duration-200">
          <div className="flex flex-col p-4 text-center font-medium text-gray-600 space-y-2">
            <a 
              href="#" 
              onClick={() => setIsMenuOpen(false)} 
              className="py-3 hover:bg-gray-50 hover:text-primary-navy rounded-lg transition"
            >
              Home
            </a>
            <a 
              href="#about" 
              onClick={() => setIsMenuOpen(false)} 
              className="py-3 hover:bg-gray-50 hover:text-primary-navy rounded-lg transition"
            >
              About
            </a>
            <a 
              href="#gist" 
              onClick={() => setIsMenuOpen(false)} 
              className="py-3 hover:bg-gray-50 hover:text-primary-navy rounded-lg transition"
            >
              Campus Gist
            </a>
            <a 
              href="mailto:fchuksd42@gmail.com" 
              onClick={() => setIsMenuOpen(false)} 
              className="py-3 hover:bg-gray-50 hover:text-primary-navy rounded-lg transition"
            >
              Contact Developer
            </a>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="flex-col items-center justify-center text-center px-4 pt-16 pb-24 md:py-32">
        <div className="bg-primary-navy/10 p-4 rounded-full mb-8 text-primary-navy mx-auto w-max">
          <BookOpen size={48} />
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold text-primary-navy mb-6 tracking-tight max-w-4xl mx-auto leading-tight">
          Your free campus study vault <br className="hidden md:block" />
          <span className="text-secondary-green">and social hub.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Access past questions, lecture notes, and collaborate with course mates across your university in one centralized platform.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
          <button 
            onClick={() => navigateTo('onboarding')}
            className="bg-primary-navy hover:bg-[#112440] text-white px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-navy/20 hover:shadow-primary-navy/40 active:scale-95"
          >
            Get Started <ArrowRight size={20} />
          </button>
          
          <button 
            onClick={() => navigateTo('login')}
            className="bg-white hover:bg-gray-50 text-primary-navy border border-gray-200 px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
          >
            <LogIn size={20} /> Log In
          </button>
        </div>
      </main>

      {/* About Section */}
      <section id="about" className="bg-white py-24 px-4 border-t border-gray-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left Column: Image */}
          <div className="relative group">
            <div className="absolute inset-0 bg-secondary-green rounded-2xl transform translate-x-4 translate-y-4 opacity-20 group-hover:translate-x-6 group-hover:translate-y-6 transition-transform duration-300"></div>
            <img 
              src={studentsImg} 
              alt="Nigerian university students collaborating dynamically with textbooks and a laptop in a sunlit campus setting" 
              className="relative z-10 w-full h-auto rounded-2xl shadow-xl object-cover aspect-[4/3]"
            />
          </div>

          {/* Right Column: Text Content */}
          <div className="text-left space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-navy tracking-tight">
                Digital Empowerment: Our Vision.
              </h2>
              <h3 className="text-xl font-semibold text-secondary-green">
                Built by Students, For Students.
              </h3>
            </div>
            
            <p className="text-gray-600 leading-relaxed text-lg">
              Studial isn't just a website; it's an answer to a challenge faced by every student in Nigerian tertiary institutions. We understand the frustration of hunts for past questions and study materials. That's why we built this unified platform. Our vision is to empower students by providing a filtered, free, and accessible vault of academic materials tailored exactly to your department.
            </p>

            <div className="pt-4">
              <button 
                onClick={() => navigateTo('onboarding')}
                className="bg-secondary-green hover:bg-[#047857] text-white px-8 py-4 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-secondary-green/20 hover:shadow-secondary-green/40 active:scale-95 inline-flex"
              >
                Get Started <ArrowRight size={20} />
              </button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}

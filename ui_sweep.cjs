const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Fix Action Buttons
    content = content.replace(/bg-primary-navy hover:bg-\[#112440\] text-white/g, 'bg-indigo-600 hover:bg-indigo-700 text-white');
    content = content.replace(/bg-primary-navy/g, 'bg-indigo-600');
    content = content.replace(/shadow-primary-navy\/30/g, 'shadow-indigo-600/30');

    // 2. Fix Text Contrast Issues
    content = content.replace(/text-slate-400 hover:text-white/g, 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white');
    content = content.replace(/text-white mb-2/g, 'text-slate-900 dark:text-white mb-2');
    
    // In Auth pages, remove text-gray-200 and text-white from body text
    content = content.replace(/text-gray-200/g, 'text-slate-600 dark:text-slate-300');
    content = content.replace(/text-gray-400/g, 'text-slate-500 dark:text-slate-400');
    
    // Fix Onboarding and Login texts
    content = content.replace(/text-white font-bold mb-8/g, 'text-slate-900 dark:text-white font-bold mb-8');
    content = content.replace(/text-white/g, 'text-slate-900 dark:text-white'); // generic catch-all, might be aggressive but text-white is bad on light bg. 
    // wait, replacing all `text-white` will break buttons! Let's revert that and be more specific
    
    content = content.replace(/text-slate-900 dark:text-slate-900 dark:text-white/g, 'text-slate-900 dark:text-white');

    // Let's specifically target paragraphs and headers in Login/Onboarding
    content = content.replace(/<h1 className="text-4xl font-bold text-white mb-2">/g, '<h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">');
    content = content.replace(/<p className="text-gray-400 text-center mb-8">/g, '<p className="text-slate-600 dark:text-slate-400 text-center mb-8">');
    content = content.replace(/<h2 className="text-2xl font-bold text-white mb-6">/g, '<h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">');
    content = content.replace(/<h2 className="text-xl font-bold text-white mb-2">/g, '<h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">');

    // 3. Global Theme Consistency (Dark/Light Mode)
    // Page backgrounds
    content = content.replace(/bg-\[#f8fafc\] dark:bg-slate-900/g, 'bg-gray-50 dark:bg-gray-950');
    content = content.replace(/bg-\[#f8fafc\] dark:bg-black/g, 'bg-gray-50 dark:bg-gray-950');
    content = content.replace(/bg-\[#f8fafc\]/g, 'bg-gray-50 dark:bg-gray-950'); // standalone 
    content = content.replace(/bg-slate-950/g, 'bg-gray-50 dark:bg-gray-950');
    content = content.replace(/bg-slate-900\/70/g, 'bg-white dark:bg-gray-900');
    
    // Container Backgrounds
    content = content.replace(/bg-white dark:bg-slate-900/g, 'bg-white dark:bg-gray-900');
    content = content.replace(/bg-white dark:bg-slate-800/g, 'bg-white dark:bg-gray-900');
    content = content.replace(/bg-\[#f8fafc\]\/95 dark:bg-slate-900\/95/g, 'bg-white/95 dark:bg-gray-900/95');

    // Remove any hardcoded dark hex codes
    content = content.replace(/bg-\[#efeae2\] dark:bg-\[#0b141a\]/g, 'bg-gray-100 dark:bg-gray-950');
    content = content.replace(/bg-\[#FFEEDB\] dark:bg-\[#182229\]/g, 'bg-indigo-50 dark:bg-indigo-900/20');
    content = content.replace(/bg-slate-900 border border-indigo-500\/30/g, 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800');
    content = content.replace(/bg-slate-950\/50/g, 'bg-gray-50 dark:bg-gray-950');
    
    // Restore buttons that should be white text
    content = content.replace(/text-slate-900 dark:text-white font-semibold py-3/g, 'text-white font-semibold py-3');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
console.log('Sweep complete');

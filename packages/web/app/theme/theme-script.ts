export const THEME_STORAGE_KEY = 'midnite.theme';

export const themeInitScript = `(function(){try{var k='${THEME_STORAGE_KEY}';var s=localStorage.getItem(k);var p=s==='light'||s==='dark'?s:'system';var r=p==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;var c=document.documentElement.classList;if(r==='dark')c.add('dark');else c.remove('dark');document.documentElement.style.colorScheme=r;}catch(e){}})();`;

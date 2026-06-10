export const THEME_STORAGE_KEY = 'midnite.theme';

export const themeInitScript = `(function(){try{var k='${THEME_STORAGE_KEY}';var s=localStorage.getItem(k);var p=(s==='light'||s==='dark'||s==='timeOfDay')?s:'system';var r;if(p==='system'){r=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}else if(p==='timeOfDay'){var h=new Date().getHours();r=(h>=8&&h<18)?'light':'dark';}else{r=p;}var c=document.documentElement.classList;if(r==='dark')c.add('dark');else c.remove('dark');document.documentElement.style.colorScheme=r;}catch(e){}})();`;

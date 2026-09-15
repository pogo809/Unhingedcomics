const themeButton=document.getElementById("themeButton");
let lightMode=false;
themeButton.addEventListener("click",()=>{
  lightMode=!lightMode;
  const root=document.documentElement;
  if(lightMode){
    root.style.setProperty("--bg","#f5f5f7");
    root.style.setProperty("--surface","#ffffff");
    root.style.setProperty("--surface-2","#eeeeF2");
    root.style.setProperty("--text","#111116");
    root.style.setProperty("--muted","#66666f");
    themeButton.textContent="🌙";
  }else{
    root.style.setProperty("--bg","#09090c");
    root.style.setProperty("--surface","#111116");
    root.style.setProperty("--surface-2","#18181f");
    root.style.setProperty("--text","#f5f5f7");
    root.style.setProperty("--muted","#a1a1aa");
    themeButton.textContent="☀";
  }
});

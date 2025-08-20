
  // Theme palette from your current script
  const THEMES = {
    default:{ "--bg":"#e4e6ff","--text":"#ff6200","--highlight":"#e9ffa8" },
    alt:{ "--bg":"#d2e6ff","--text":"#A70A4E","--highlight":"#FF9DFF" },
    gray:{ "--bg":"#FFDCF6","--text":"#d60b6d","--highlight":"#83dbd6ff" },
  };
  const ORDER = ["default","alt","gray"];

  function applyTheme(name){
    if(!THEMES[name]) name="default";
    for(const [k,v] of Object.entries(THEMES[name])){
      document.documentElement.style.setProperty(k,v);
    }
    localStorage.setItem("theme",name);
  }
  function nextTheme(){
    const cur = localStorage.getItem("theme") || "default";
    const idx = (ORDER.indexOf(cur)+1)%ORDER.length;
    return ORDER[idx];
  }

  document.addEventListener("DOMContentLoaded",()=>{
    applyTheme(localStorage.getItem("theme")||"default");

    const t = document.getElementById("themeToggle");
    if(t){
      t.addEventListener("click",()=>{
        applyTheme(nextTheme());
      });
    }

    // slide-in on load
    const w = document.querySelector(".slide-target");
    if(w){ w.classList.add("slide-in"); }

    // simple keyboard focus style opt-in for accessibility
    document.body.addEventListener("mousedown",()=>document.body.classList.add("had-mouse"));
  });


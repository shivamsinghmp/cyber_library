// Content script - runs on cyberlib.in pages
// Adds a floating PiP button on the page

(function() {
  if (document.getElementById("cl-pip-btn")) return;

  const btn = document.createElement("button");
  btn.id = "cl-pip-btn";
  btn.title = "Picture-in-Picture mein kholein";
  btn.innerHTML = "⊡";
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(197,169,122,0.15);
    border: 1px solid rgba(197,169,122,0.3);
    color: #c5a97a;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    transition: all 0.2s;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;

  btn.addEventListener("mouseenter", () => {
    btn.style.background = "rgba(197,169,122,0.3)";
    btn.style.transform = "scale(1.1)";
    btn.style.boxShadow = "0 0 20px rgba(197,169,122,0.4)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "rgba(197,169,122,0.15)";
    btn.style.transform = "scale(1)";
    btn.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
  });

  btn.addEventListener("click", () => {
    try {
      // Document PiP API (Chrome 116+)
      if (window.documentPictureInPicture) {
        window.documentPictureInPicture.requestWindow({ width: 420, height: 680 })
          .then((pipWin) => {
            const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')];
            styles.forEach(el => pipWin.document.head.appendChild(el.cloneNode(true)));
            const clone = document.documentElement.cloneNode(true);
            pipWin.document.replaceChild(clone, pipWin.document.documentElement);
          })
          .catch(() => fallbackPopup());
      } else {
        fallbackPopup();
      }
    } catch {
      fallbackPopup();
    }
  });

  function fallbackPopup() {
    const w = window.open(
      window.location.href,
      "_pip_cyber",
      `width=420,height=680,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no,top=50,left=${screen.width - 440}`
    );
    if (w) w.focus();
  }

  document.body.appendChild(btn);
})();

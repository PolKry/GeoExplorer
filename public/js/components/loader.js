document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-component]").forEach(el => {
    const file = el.dataset.component;

    fetch(file)
      .then(res => res.text())
      .then(data => {
        el.innerHTML = data;
        // Scripts added through innerHTML are inert. Replace them with real script
        // elements so a component can bring along its own behavior.
        el.querySelectorAll("script").forEach(script => {
          const executableScript = document.createElement("script");
          [...script.attributes].forEach(attribute =>
            executableScript.setAttribute(attribute.name, attribute.value)
          );
          executableScript.textContent = script.textContent;
          script.replaceWith(executableScript);
        });
        window.dispatchEvent(new CustomEvent("component:loaded", { detail: { element: el, file } }));
        console.log("Loaded component: " + file);
      })
      .catch(err => {
        console.error("Failed to load component:", file, err);
      });
});
});

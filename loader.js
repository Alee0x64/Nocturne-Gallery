(() => {
  const loader = document.getElementById("nocturne-loader");

  if (!loader) return;

  const hideLoader = () => {
    loader.classList.add("is-hidden");

    window.setTimeout(() => {
      loader.remove();
    }, 700);
  };

  if (document.readyState === "complete") {
    hideLoader();
  } else {
    window.addEventListener("load", hideLoader, { once: true });
  }
})();
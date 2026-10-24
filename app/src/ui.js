export function initUI() {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (prefersDark) {
    document.documentElement.classList.add("dark");
    document.getElementById("themeIcon").textContent = "light_mode";
  }

  document.getElementById("themeToggle").addEventListener("click", function () {
    document.documentElement.classList.toggle("dark");
    const themeIcon = document.getElementById("themeIcon");
    themeIcon.textContent = document.documentElement.classList.contains("dark")
      ? "light_mode"
      : "dark_mode";
  });

  // Mobile sidebar
  const menuToggle = document.getElementById("menuToggle");
  const mobileOverlay = document.getElementById("mobileOverlay");
  const sidebar = document.getElementById("sidebar");

  const toggleSidebar = () => {
    sidebar.classList.toggle("-translate-x-full");
    mobileOverlay.classList.toggle("hidden");
  };

  menuToggle.addEventListener("click", toggleSidebar);
  mobileOverlay.addEventListener("click", toggleSidebar);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !sidebar.classList.contains("-translate-x-full")) {
      toggleSidebar();
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
      sidebar.classList.remove("-translate-x-full");
      mobileOverlay.classList.add("hidden");
    }
  });
}

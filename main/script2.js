document.addEventListener("DOMContentLoaded", function () {
      // Theme
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
        document.getElementById("themeIcon").textContent = "light_mode";
      }

      document
        .getElementById("themeToggle")
        .addEventListener("click", function () {
          document.documentElement.classList.toggle("dark");
          const themeIcon = document.getElementById("themeIcon");
          themeIcon.textContent = document.documentElement.classList.contains(
            "dark"
          )
            ? "light_mode"
            : "dark_mode";
        });

      // Mobile Sidebar
      const menuToggle = document.getElementById("menuToggle");
      const mobileOverlay = document.getElementById("mobileOverlay");
      const sidebar = document.getElementById("sidebar");

      function toggleSidebar() {
        sidebar.classList.toggle("-translate-x-full");
        mobileOverlay.classList.toggle("hidden");
        document.body.style.overflow = sidebar.classList.contains(
          "-translate-x-full"
        )
          ? ""
          : "hidden";
      }

      menuToggle.addEventListener("click", toggleSidebar);
      mobileOverlay.addEventListener("click", toggleSidebar);

      // Close on escape
      document.addEventListener("keydown", (e) => {
        if (
          e.key === "Escape" &&
          !sidebar.classList.contains("-translate-x-full")
        ) {
          toggleSidebar();
        }
      });

      // Close on resize to desktop
      window.addEventListener("resize", () => {
        if (window.innerWidth >= 1024) {
          sidebar.classList.remove("-translate-x-full");
          mobileOverlay.classList.add("hidden");
          document.body.style.overflow = "";
        }
      });
    });
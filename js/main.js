/* const themedSections = [...document.querySelectorAll("section[data-theme]")];
const root = document.documentElement;

function updatePageTheme() {
	const center = window.innerHeight / 2;
	const activeSection = themedSections.find((section) => {
		const bounds = section.getBoundingClientRect();
		return bounds.top <= center && bounds.bottom >= center;
	});

	if (!activeSection) return;

	const theme = getComputedStyle(activeSection);
	root.style.setProperty("--page-bg", theme.getPropertyValue("--section-bg").trim());
	root.style.setProperty("--page-text", theme.getPropertyValue("--section-text").trim());
}

const themeObserver = new IntersectionObserver(updatePageTheme, {
	rootMargin: "-49% 0px -49% 0px",
	threshold: 0,
});

themedSections.forEach((section) => themeObserver.observe(section));
updatePageTheme();
 */